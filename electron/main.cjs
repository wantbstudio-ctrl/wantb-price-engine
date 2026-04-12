const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");
const http = require("http");
const next = require("next");
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