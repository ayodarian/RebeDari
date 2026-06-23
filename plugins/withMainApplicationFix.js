const { withMainApplication } = require("expo/config-plugins");
const { createBaseMod } = require("@expo/config-plugins/build/plugins/createBaseMod");
const fs = require("fs");
const path = require("path");

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

const EXPECTED_GRADLE_URL = "https\\://services.gradle.org/distributions/gradle-8.14.3-bin.zip";

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
  config = withMainApplication(config, (config) => {
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

  config = withGradleWrapperFix(config);

  return config;
}

function withGradleWrapperFix(config) {
  const mod = createBaseMod({
    platform: "android",
    modName: "gradleWrapper",
    isIntrospective: true,
    getFilePath({ modRequest: { platformProjectRoot } }) {
      return path.join(platformProjectRoot, "gradle", "wrapper", "gradle-wrapper.properties");
    },
    async read(filePath) {
      try {
        return await fs.promises.readFile(filePath, "utf-8");
      } catch {
        return "";
      }
    },
    async write(filePath, { modResults }) {
      if (typeof modResults !== "string") return;
      if (modResults.includes(EXPECTED_GRADLE_URL)) return;
      const fixed = modResults.replace(
        /(distributionUrl=).*$/m,
        `$1${EXPECTED_GRADLE_URL}`
      );
      await fs.promises.writeFile(filePath, fixed);
    },
  });
  return mod(config, { skipEmptyMod: false });
}

module.exports = withMainApplicationFix;
