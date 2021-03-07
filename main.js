// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain, clipboard, Notification, Menu, Tray } = require('electron')
const path = require('path')
const ip = require('ip');
const { generateKeyPairSync, privateDecrypt, publicEncrypt } = require('crypto');
const http = require('http');
const { v4: uuidv4 } = require('uuid');


let keysfinal = null
let body = [];
let message = "";
const passphrase = uuidv4();
const serverPort = 8080;
let tray = null

app.whenReady().then(() => {
  setupMenu()
  createWindow()

  let url = loadServer()
  
  ipcMain.on('ready', (event, arg) => {
    if(keysfinal == null) {
      generateKeyPairs()
    }
    event.reply('qrcode', url+ ":" + serverPort + "#ysnp#" + keysfinal.publicKey)
  })

  setupTray()
})

app.on('window-all-closed', function () {
  if(process.platform == 'darwin') app.dock.hide()
})

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    titleBarStyle: 'hidden',
    icon: path.join(__dirname,'resources', "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true
    }
  })

  mainWindow.loadFile('index.html')
  if(process.platform == 'darwin') app.dock.show()
}

function loadServer() {
  
  http.createServer((request, response) => {
    if (request.method === 'POST' && request.url === '/message') {
      request
        .on('data', (chunk) => {
          body.push(chunk);
        })
        .on('end', () => {
          message = Buffer.concat(body).toString();
          body = [];
          console.log('received: %s', message);
          try{
            var decryptedMessage = decryptStringWithRsaPrivateKey(message)
            clipboard.writeText(decryptedMessage)
            showNotification()
            response.statusCode = 200;
          } catch(error) {
            response.statusCode = 403;
          }
          finally {
            response.end();
          }
        })
    } else if (request.method === 'GET' && request.url === '/ping'){
      response.statusCode = 200;
      response.end(); 
    }
    else {
      response.statusCode = 404;
      response.end();
    }
  }).listen(8080);

  return ip.address();
}

function generateKeyPairs() {
  keysfinal = generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: passphrase
    }
  })
  return keysfinal
}

function decryptStringWithRsaPrivateKey(toDecrypt) {

  let privateKey = keysfinal.privateKey
  let buffer = new Buffer(toDecrypt, "base64");
  const decrypted = privateDecrypt(
      {
          key: privateKey.toString(),
          passphrase: passphrase,
      },
      buffer,
  )
  return decrypted.toString("utf8");
};

function showNotification () {
  const notification = {
    title: 'YouShallNotPass',
    body: 'Content added to the clipboard!',
  }
  new Notification(notification).show()
}

function setupTray() {
  const iconName = process.platform !== 'darwin' ? 'ysnp_tray.ico' : 'ysnp_tray.png'
  const iconPath = path.join(__dirname,'resources', iconName)
  tray = new Tray(iconPath)
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open', click: () => { createWindow() } },
    { label: 'Quit', click: () => { app.quit() } }
  ])
  tray.setContextMenu(contextMenu)
}

function setupMenu() {
  const isMac = process.platform === 'darwin'
  const sub = [
      { role: 'about' },
      { type: 'separator' },
      { role: 'close' },
      { type: 'separator' },
      { role: 'quit' }
    ];
  const template = 
    (isMac ? [{
      label: app.name,
      submenu: sub
    }] : [{
      label: 'File',
      submenu: sub
    }])

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
