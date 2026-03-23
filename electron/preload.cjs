const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // 기존 라이센스 관련
  getHardwareId: () => ipcRenderer.invoke("getHardwareId"),
  getLicenseStatus: () => ipcRenderer.invoke("getLicenseStatus"),
  validateAndSaveLicense: (key) =>
    ipcRenderer.invoke("validateAndSaveLicense", key),
  clearLicense: () => ipcRenderer.invoke("clearLicense"),

  // 저장 다이얼로그
  showSaveDialog: (options) =>
    ipcRenderer.invoke("show-save-dialog", options),

  // 이미지 저장
  saveBinaryFile: (payload) =>
    ipcRenderer.invoke("save-binary-file", payload),

  // PDF 저장
  savePDF: (html, defaultFileName) =>
    ipcRenderer.invoke("save-pdf", { html, defaultFileName }),
});