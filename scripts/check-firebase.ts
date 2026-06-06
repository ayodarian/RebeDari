import path from 'path';
import { fileURLToPath } from 'url';

async function main(){
  try{
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const mod = await import(path.resolve(__dirname, '..', 'lib', 'firebase'));
    console.log('firebaseReady=', mod.firebaseReady);
    console.log('app=', !!mod.app);
    console.log('auth=', !!mod.auth);
    console.log('db=', !!mod.db);
    console.log('storage=', !!mod.storage);
  }catch(e:any){
    console.error('Error importing firebase module:', e && e.message ? e.message : e);
    process.exit(2);
  }
}

main();
