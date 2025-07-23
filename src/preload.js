const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Renderer to Main (one-way)
    send: (channel, data) => {
        ipcRenderer.send(channel, data);
    },
    // Renderer to Main (two-way)
    invoke: (channel, data) => {
        return ipcRenderer.invoke(channel, data);
    },
    // Main to Renderer
    on: (channel, callback) => {
        const newCallback = (_, data) => callback(data);
        ipcRenderer.on(channel, newCallback);
        // Return a function to remove the listener
        return () => ipcRenderer.removeListener(channel, newCallback);
    }
});