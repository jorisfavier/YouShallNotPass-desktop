const packager = require('electron-packager')

async function bundleElectronApp(options) {
  const appPaths = await packager(options)
  console.log(`Electron app bundles created:\n${appPaths.join("\n")}`)
}

(async() => {
  console.log('Wait for it...')
  await bundleElectronApp({
  	dir: "./",
  	overwrite: true,
  	derefSymlinks: true,
  	arch: ['x64'],
  	platform: ['darwin', 'linux'],
    icon: "./resources/ysnp_icon.icns"
  }) 
  console.log('Done!')
})()

