const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");
const http = require("http");
const next = require("next");
const { execFile } = require("child_process");
const { getEmbeddedLicenseCodes } = require("./licenseStore.cjs");

const isDev = !app.isPackaged;
const PROD_PORT = 3210;
const MASTER_KEY = "WANTB-MASTER-001";

let mainWindow = null;
let prodServer = null;
let nextApp = null;

function getUserDataDir() {
  return app.getPath("userData");
}

function getDebugLogPath() {
  return path.join(getUserDataDir(), "wantb-debug.log");
}

function writeDebugLog(...args) {
  try {
    const line =
      `[${new Date().toISOString()}] ` +
      args
        .map((arg) => {
          if (typeof arg === "string") return arg;
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        })
        .join(" ") +
      "\n";

    fs.appendFileSync(getDebugLogPath(), line, "utf-8");
  } catch {}
}

function getAppRoot() {
  return isDev ? path.join(__dirname, "..") : app.getAppPath();
}

function getLicenseFilePath() {
  return path.join(getUserDataDir(), "license.json");
}

function ensureUserDataDir() {
  const dir = getUserDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createHardwareId() {
  try {
    const raw = [
      os.hostname(),
      os.platform(),
      os.arch(),
      os.cpus()?.[0]?.model || "",
      os.totalmem()?.toString() || "",
    ].join("|");

    return crypto
      .createHash("sha256")
      .update(raw)
      .digest("hex")
      .slice(0, 16)
      .toUpperCase();
  } catch (error) {
    writeDebugLog("Hardware ID 생성 실패", error?.message || error);
    return "UNKNOWN-HWID";
  }
}

function readLicenseFile() {
  try {
    const filePath = getLicenseFilePath();

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    writeDebugLog("라이센스 파일 읽기 실패", error?.message || error);
    return null;
  }
}

function writeLicenseFile(data) {
  try {
    ensureUserDataDir();
    fs.writeFileSync(
      getLicenseFilePath(),
      JSON.stringify(data, null, 2),
      "utf-8"
    );
    return true;
  } catch (error) {
    writeDebugLog("라이센스 파일 저장 실패", error?.message || error);
    return false;
  }
}

function isLicenseActivated() {
  const saved = readLicenseFile();
  return Boolean(saved?.activated && saved?.licenseKey);
}

function isValidLicenseKey(inputKey) {
  try {
    const normalized = String(inputKey || "").trim().toUpperCase();
    if (!normalized) return false;

    if (normalized === MASTER_KEY.toUpperCase()) {
      writeDebugLog("MASTER KEY 인증 성공");
      return true;
    }

    const codes = getEmbeddedLicenseCodes();
    writeDebugLog("embedded license code count", codes.length);

    return codes.includes(normalized);
  } catch (error) {
    writeDebugLog("라이센스 검증 실패", error?.message || error);
    return false;
  }
}

function getDevStartUrl() {
  return isLicenseActivated()
    ? "http://localhost:3000/"
    : "http://localhost:3000/license";
}

function getProdStartUrl() {
  return isLicenseActivated()
    ? `http://127.0.0.1:${PROD_PORT}/`
    : `http://127.0.0.1:${PROD_PORT}/license`;
}

async function ensureProdServer() {
  if (isDev) return;
  if (prodServer) return;

  const appDir = getAppRoot();

  writeDebugLog("appDir", appDir);
  writeDebugLog("process.resourcesPath", process.resourcesPath);
  writeDebugLog(".next exists", fs.existsSync(path.join(appDir, ".next")));
  writeDebugLog(
    "next.config.js exists",
    fs.existsSync(path.join(appDir, "next.config.js"))
  );

  nextApp = next({
    dev: false,
    dir: appDir,
  });

  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();

  await new Promise((resolve, reject) => {
    prodServer = http.createServer((req, res) => {
      handle(req, res);
    });

    prodServer.once("error", (error) => {
      writeDebugLog("프로덕션 Next 서버 시작 실패", error?.message || error);
      reject(error);
    });

    prodServer.listen(PROD_PORT, "127.0.0.1", () => {
      writeDebugLog(`프로덕션 Next 서버 실행 http://127.0.0.1:${PROD_PORT}`);
      resolve();
    });
  });
}

function isInternalWindowUrl(url) {
  try {
    if (!url) return false;

    if (url === "about:blank") return true;
    if (url.startsWith("devtools://")) return true;
    if (url.startsWith("file://")) return true;
    if (url.startsWith("data:")) return true;

    if (
      url.startsWith("http://localhost:3000") ||
      url.startsWith("http://127.0.0.1:3000") ||
      url.startsWith(`http://127.0.0.1:${PROD_PORT}`)
    ) {
      return true;
    }

    return false;
  } catch (error) {
    writeDebugLog("isInternalWindowUrl 판별 실패", error?.message || error);
    return false;
  }
}

function sanitizeFileName(fileName, fallback = "output") {
  const safe = String(fileName || fallback)
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim();

  return safe || fallback;
}

function resolveDefaultPath(options = {}) {
  const downloadsPath = app.getPath("downloads");
  const defaultFileName = sanitizeFileName(
    options.defaultPath || options.defaultFileName || options.fileName || "output"
  );

  if (path.isAbsolute(defaultFileName)) {
    return defaultFileName;
  }

  return path.join(downloadsPath, defaultFileName);
}

async function showSaveDialogInternal(options = {}) {
  const browserWindow = BrowserWindow.getFocusedWindow() || mainWindow || null;

  const result = await dialog.showSaveDialog(browserWindow, {
    title: options.title || "저장 위치 선택",
    defaultPath: resolveDefaultPath(options),
    filters: Array.isArray(options.filters) ? options.filters : undefined,
    properties: ["showOverwriteConfirmation"],
  });

  return result;
}

function toBufferFromPayload(payload = {}) {
  try {
    if (Buffer.isBuffer(payload.buffer)) {
      return payload.buffer;
    }

    if (payload.byteArray && Array.isArray(payload.byteArray)) {
      return Buffer.from(payload.byteArray);
    }

    if (payload.bytes && Array.isArray(payload.bytes)) {
      return Buffer.from(payload.bytes);
    }

    if (typeof payload.base64 === "string" && payload.base64.trim()) {
      return Buffer.from(payload.base64, "base64");
    }

    if (
      typeof payload.dataUrl === "string" &&
      payload.dataUrl.startsWith("data:")
    ) {
      const base64 = payload.dataUrl.split(",")[1] || "";
      return Buffer.from(base64, "base64");
    }

    if (typeof payload.text === "string") {
      return Buffer.from(payload.text, "utf-8");
    }

    return null;
  } catch (error) {
    writeDebugLog("Buffer 변환 실패", error?.message || error);
    return null;
  }
}

async function saveBinaryFileInternal(payload = {}) {
  const saveDialogResult = await showSaveDialogInternal({
    title: payload.title || "파일 저장",
    defaultPath:
      payload.defaultPath ||
      payload.defaultFileName ||
      payload.fileName ||
      "output",
    filters: payload.filters,
  });

  if (saveDialogResult.canceled || !saveDialogResult.filePath) {
    return {
      success: false,
      canceled: true,
      filePath: "",
      message: "사용자가 저장을 취소했습니다.",
    };
  }

  const buffer = toBufferFromPayload(payload);

  if (!buffer) {
    return {
      success: false,
      canceled: false,
      filePath: saveDialogResult.filePath,
      message: "저장할 데이터가 없습니다.",
    };
  }

  fs.writeFileSync(saveDialogResult.filePath, buffer);

  return {
    success: true,
    canceled: false,
    filePath: saveDialogResult.filePath,
    message: "파일 저장 완료",
  };
}

async function savePdfInternal(html, defaultFileName) {
  const saveDialogResult = await showSaveDialogInternal({
    title: "PDF 저장",
    defaultPath: defaultFileName || "document.pdf",
    filters: [{ name: "PDF Files", extensions: ["pdf"] }],
  });

  if (saveDialogResult.canceled || !saveDialogResult.filePath) {
    return {
      success: false,
      canceled: true,
      filePath: "",
      message: "사용자가 저장을 취소했습니다.",
    };
  }

  const pdfWindow = new BrowserWindow({
    show: false,
    width: 1200,
    height: 1600,
    autoHideMenuBar: true,
    webPreferences: {
      sandbox: false,
    },
  });

  try {
    await pdfWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(html || "")}`
    );

    const pdfBuffer = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      pageSize: "A4",
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      },
    });

    fs.writeFileSync(saveDialogResult.filePath, pdfBuffer);

    return {
      success: true,
      canceled: false,
      filePath: saveDialogResult.filePath,
      message: "PDF 저장 완료",
    };
  } catch (error) {
    writeDebugLog("PDF 저장 실패", error?.message || error);
    return {
      success: false,
      canceled: false,
      filePath: saveDialogResult.filePath || "",
      message: "PDF 저장 중 오류가 발생했습니다.",
    };
  } finally {
    if (!pdfWindow.isDestroyed()) {
      pdfWindow.close();
    }
  }
}

function normalizeExternalUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  return `https://${raw}`;
}

async function openExternalUrlInternal(url) {
  try {
    const targetUrl = normalizeExternalUrl(url);

    writeDebugLog("openExternalUrlInternal called", {
      input: url,
      normalized: targetUrl,
    });

    if (!targetUrl) {
      writeDebugLog("openExternalUrlInternal invalid url");
      return {
        success: false,
        message: "열 URL이 없습니다.",
      };
    }

    await shell.openExternal(targetUrl);

    writeDebugLog("openExternalUrlInternal success", targetUrl);

    return {
      success: true,
      message: "외부 브라우저 실행 완료",
      url: targetUrl,
    };
  } catch (error) {
    writeDebugLog("외부 브라우저 실행 실패", error?.message || error);
    return {
      success: false,
      message: error?.message || "외부 브라우저 실행 중 오류가 발생했습니다.",
    };
  }
}

function getChromeCandidates() {
  return [
    path.join(
      process.env["PROGRAMFILES"] || "C:\\Program Files",
      "Google",
      "Chrome",
      "Application",
      "chrome.exe"
    ),
    path.join(
      process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)",
      "Google",
      "Chrome",
      "Application",
      "chrome.exe"
    ),
    path.join(
      process.env["LOCALAPPDATA"] || "",
      "Google",
      "Chrome",
      "Application",
      "chrome.exe"
    ),
  ].filter(Boolean);
}

function findChromePath() {
  const candidates = getChromeCandidates();

  for (const candidate of candidates) {
    try {
      if (candidate && fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {}
  }

  return "";
}

async function openHometaxWithChrome() {
  const targetUrl = "https://www.hometax.go.kr/";
  const chromePath = findChromePath();

  writeDebugLog("openHometaxWithChrome start", {
    chromePath,
    targetUrl,
  });

  if (!chromePath) {
    writeDebugLog("chrome executable not found, fallback to shell.openExternal");
    return await openExternalUrlInternal(targetUrl);
  }

  return await new Promise((resolve) => {
    const args = ["--new-window", "--incognito", targetUrl];

    execFile(chromePath, args, (error) => {
      if (error) {
        writeDebugLog("openHometaxWithChrome failed", error?.message || error);
        resolve({
          success: false,
          message: error?.message || "홈택스 실행 중 오류가 발생했습니다.",
        });
        return;
      }

      writeDebugLog("openHometaxWithChrome success", {
        chromePath,
        args,
      });

      resolve({
        success: true,
        message: "홈택스 실행 완료",
        url: targetUrl,
      });
    });
  });
}

async function openUrlWithChrome(url) {
  try {
    const targetUrl = normalizeExternalUrl(url);
    const chromePath = findChromePath();

    writeDebugLog("openUrlWithChrome start", {
      input: url,
      targetUrl,
      chromePath,
    });

    if (!targetUrl) {
      return {
        success: false,
        message: "URL이 없습니다.",
      };
    }

    if (!chromePath) {
      writeDebugLog("chrome executable not found, fallback to shell.openExternal");
      return await openExternalUrlInternal(targetUrl);
    }

    return await new Promise((resolve) => {
      const args = ["--new-window", targetUrl];

      execFile(chromePath, args, (error) => {
        if (error) {
          writeDebugLog("openUrlWithChrome failed", error?.message || error);

          resolve({
            success: false,
            message: error?.message || "Chrome 실행 실패",
          });
          return;
        }

        writeDebugLog("openUrlWithChrome success", {
          chromePath,
          args,
        });

        resolve({
          success: true,
          message: "Chrome 실행 완료",
          url: targetUrl,
        });
      });
    });
  } catch (error) {
    writeDebugLog("openUrlWithChrome exception", error?.message || error);

    return {
      success: false,
      message: "Chrome 실행 중 오류가 발생했습니다.",
    };
  }
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 980,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: "#ffffff",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    writeDebugLog("setWindowOpenHandler url", url);

    if (isInternalWindowUrl(url)) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          width: 1100,
          height: 900,
          backgroundColor: "#ffffff",
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
          },
        },
      };
    }

    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    await mainWindow.loadURL(getDevStartUrl());
  } else {
    await ensureProdServer();
    await mainWindow.loadURL(getProdStartUrl());
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  ensureUserDataDir();
  writeDebugLog("앱 시작", { isDev, userData: getUserDataDir() });

  ipcMain.handle("getHardwareId", async () => {
    try {
      return createHardwareId();
    } catch {
      return "UNKNOWN-HWID";
    }
  });

  ipcMain.handle("getLicenseStatus", async () => {
    try {
      const saved = readLicenseFile();

      return {
        activated: !!saved?.activated,
        licenseKey: saved?.licenseKey || "",
        hardwareId: saved?.hardwareId || createHardwareId(),
      };
    } catch {
      return {
        activated: false,
        licenseKey: "",
        hardwareId: createHardwareId(),
      };
    }
  });

  ipcMain.handle("validateAndSaveLicense", async (_, licenseKey) => {
    try {
      const hardwareId = createHardwareId();
      const normalized = String(licenseKey || "").trim().toUpperCase();

      if (!isValidLicenseKey(normalized)) {
        return {
          success: false,
          message: "유효하지 않은 라이센스 키입니다.",
        };
      }

      const saved = writeLicenseFile({
        activated: true,
        licenseKey: normalized,
        hardwareId,
        activatedAt: new Date().toISOString(),
      });

      if (!saved) {
        return {
          success: false,
          message: "라이센스 저장 중 오류가 발생했습니다.",
        };
      }

      return {
        success: true,
        message: "라이센스 인증이 완료되었습니다.",
      };
    } catch (error) {
      writeDebugLog("라이센스 인증 처리 실패", error?.message || error);
      return {
        success: false,
        message: "라이센스 인증 중 오류가 발생했습니다.",
      };
    }
  });

  ipcMain.handle("clearLicense", async () => {
    try {
      const filePath = getLicenseFilePath();

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return { success: true };
    } catch {
      return { success: false };
    }
  });

  ipcMain.handle("show-save-dialog", async (_, options) => {
    try {
      const result = await showSaveDialogInternal(options || {});
      return {
        canceled: !!result.canceled,
        filePath: result.filePath || "",
      };
    } catch (error) {
      writeDebugLog("show-save-dialog 실패", error?.message || error);
      return {
        canceled: true,
        filePath: "",
      };
    }
  });

  ipcMain.handle("save-binary-file", async (_, payload) => {
    try {
      return await saveBinaryFileInternal(payload || {});
    } catch (error) {
      writeDebugLog("save-binary-file 실패", error?.message || error);
      return {
        success: false,
        canceled: false,
        filePath: "",
        message: "파일 저장 중 오류가 발생했습니다.",
      };
    }
  });

  ipcMain.handle("save-pdf", async (_, { html, defaultFileName } = {}) => {
    try {
      return await savePdfInternal(html || "", defaultFileName || "document.pdf");
    } catch (error) {
      writeDebugLog("save-pdf 실패", error?.message || error);
      return {
        success: false,
        canceled: false,
        filePath: "",
        message: "PDF 저장 중 오류가 발생했습니다.",
      };
    }
  });

  ipcMain.handle("open-external-url", async (_, url) => {
    writeDebugLog("ipcMain open-external-url received", url);
    return await openExternalUrlInternal(url);
  });

  ipcMain.handle("open-hometax-direct", async () => {
    writeDebugLog("ipcMain open-hometax-direct received");
    return await openHometaxWithChrome();
  });

  ipcMain.handle("open-url-with-chrome", async (_, url) => {
    writeDebugLog("ipcMain open-url-with-chrome received", url);
    return await openUrlWithChrome(url);
  });

  try {
    await createMainWindow();
  } catch (error) {
    dialog.showErrorBox(
      "원프앤 실행 오류",
      `${error?.message || error}\n\n로그 경로:\n${getDebugLogPath()}`
    );
  }

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on("before-quit", async () => {
  if (prodServer) {
    await new Promise((resolve) => {
      prodServer.close(() => resolve());
    });
    prodServer = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});