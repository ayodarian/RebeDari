const { withMainApplication } = require("expo/config-plugins");

const REACT_NATIVE_HOST_BLOCK = `  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
    this,
    object : DefaultReactNativeHost(this) {
      override fun getPackages(): List<ReactPackage> =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        }

      override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

      override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

      override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
    }
  )

`;

const REQUIRED_IMPORTS = [
  "import com.facebook.react.ReactNativeHost",
  "import com.facebook.react.defaults.DefaultReactNativeHost",
  "import expo.modules.ReactNativeHostWrapper",
];

function ensureImports(contents) {
  let updated = contents;
  for (const imp of REQUIRED_IMPORTS) {
    if (!updated.includes(imp)) {
      updated = updated.replace(
        "import expo.modules.ApplicationLifecycleDispatcher",
        `${imp}\n\nimport expo.modules.ApplicationLifecycleDispatcher`
      );
    }
  }
  return updated;
}

function withMainApplicationFix(config) {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes("override val reactNativeHost:")) {
      contents = ensureImports(contents);
      contents = contents.replace(
        "  override val reactHost: ReactHost by lazy {",
        `${REACT_NATIVE_HOST_BLOCK}  override val reactHost: ReactHost by lazy {`
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withMainApplicationFix;
