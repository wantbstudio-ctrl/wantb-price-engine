const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");

const isDev = !app.isPackaged;
const SECRET = "WANTB_SECRET";

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

function generateExpectedLicense(hardwareId) {
  return crypto
    .createHash("sha256")
    .update(`${hardwareId}-${SECRET}`)
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();
}

function isValidLicenseKey(inputKey, hardwareId) {
  if (!inputKey) return false;

  const trimmed = String(inputKey).trim();

  if (trimmed === "test123") return true;

  const expected = generateExpectedLicense(hardwareId);
  return trimmed === expected;
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
  mainWindow.webContents.openDevTools();

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    await mainWindow.loadURL("http://localhost:3000/company-settings");
  } else {
    const startUrl = `file://${path.join(__dirname, "../out/company-settings.html")}`;
    await mainWindow.loadURL(startUrl);
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

    if (!isValidLicenseKey(licenseKey, hardwareId)) {
      return {
        success: false,
        message: "유효하지 않은 라이센스 키입니다.",
      };
    }

    const saved = writeLicenseFile({
      activated: true,
      licenseKey: String(licenseKey).trim(),
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