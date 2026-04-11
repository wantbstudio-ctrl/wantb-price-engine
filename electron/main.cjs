const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");

const isDev = !app.isPackaged;

let mainWindow = null;

function createHardwareId() {
  const raw = `${os.hostname()}-${os.platform()}-${os.arch()}-${os.cpus()[0]?.model || "cpu"}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16).toUpperCase();
}

function getUserDataDir() {
  return app.getPath("userData");
}

function getLicenseFilePath() {
  return path.join(getUserDataDir(), "license.json");
}

function readLicenseFile() {
  try {
    const filePath = getLicenseFilePath();
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    console.error("라이센스 파일 읽기 실패:", error);
    return null;
  }
}

function writeLicenseFile(data) {
  try {
    const filePath = getLicenseFilePath();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("라이센스 파일 저장 실패:", error);
    return false;
  }
}

function isLicenseActivated() {
  const saved = readLicenseFile();
  return !!saved?.activated;
}

function getLicenseCodesFilePath() {
  return path.join(__dirname, "../license-data/license-codes.txt");
}

function isValidLicenseKey(inputKey) {
  try {
    if (!inputKey) return false;

    const trimmed = String(inputKey).trim().toUpperCase();
    const filePath = getLicenseCodesFilePath();

    if (!fs.existsSync(filePath)) {
      console.error("license-codes.txt 없음:", filePath);
      return false;
    }

    const raw = fs.readFileSync(filePath, "utf-8");

    const codes = raw
      .split(/\r?\n/)
      .map((line) => line.trim().toUpperCase())
      .filter(Boolean);

    return codes.includes(trimmed);
  } catch (error) {
    console.error("라이센스 검증 실패:", error);
    return false;
  }
}

function getDevStartUrl() {
  return isLicenseActivated()
    ? "http://localhost:3000/"
    : "http://localhost:3000/license";
}

function getProdStartUrl() {
  const targetFile = isLicenseActivated() ? "index.html" : "license.html";
  return `file://${path.join(__dirname, "../out", targetFile)}`;
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
    await mainWindow.loadURL(getProdStartUrl());
  }
}

app.whenReady().then(async () => {
  ipcMain.handle("getHardwareId", async () => {
    return createHardwareId();
  });

  ipcMain.handle("getLicenseStatus", async () => {
    const saved = readLicenseFile();

    if (!saved) {
      return {
        activated: false,
        licenseKey: "",
        hardwareId: createHardwareId(),
      };
    }

    return {
      activated: !!saved.activated,
      licenseKey: saved.licenseKey || "",
      hardwareId: saved.hardwareId || createHardwareId(),
    };
  });

  ipcMain.handle("validateAndSaveLicense", async (_, licenseKey) => {
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
  });

  ipcMain.handle("clearLicense", async () => {
    try {
      const filePath = getLicenseFilePath();

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error("라이센스 삭제 실패:", error);
      return {
        success: false,
      };
    }
  });

  await createMainWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});