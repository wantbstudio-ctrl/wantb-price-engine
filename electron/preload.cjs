const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getHardwareId: () => ipcRenderer.invoke("getHardwareId"),
  getLicenseStatus: () => ipcRenderer.invoke("getLicenseStatus"),
  validateAndSaveLicense: (key) =>
    ipcRenderer.invoke("validateAndSaveLicense", key),
  clearLicense: () => ipcRenderer.invoke("clearLicense"),

  showSaveDialog: (options) =>
    ipcRenderer.invoke("show-save-dialog", options),

  saveBinaryFile: (payload) =>
    ipcRenderer.invoke("save-binary-file", payload),

  savePDF: (html, defaultFileName) =>
    ipcRenderer.invoke("save-pdf", { html, defaultFileName }),

  openExternalUrl: (url) =>
    ipcRenderer.invoke("open-external-url", url),

  openHometaxDirect: () =>
    ipcRenderer.invoke("open-hometax-direct"),
});