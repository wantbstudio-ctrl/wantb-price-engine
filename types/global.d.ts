export {};

declare global {
  interface Window {
    electronAPI?: {
      getHardwareId?: () => Promise<string>;
      getLicenseStatus?: () => Promise<boolean>;
      validateAndSaveLicense?: (
        code: string
      ) => Promise<{
        success: boolean;
        message?: string;
      }>;
      clearLicense?: () => Promise<boolean>;
      openHomeTax?: () => Promise<boolean>;
      showSaveDialog?: (options: {
        defaultFileName: string;
      }) => Promise<{
        canceled: boolean;
        filePath?: string;
      }>;
      savePDF?: (
        html: string,
        defaultFileName: string
      ) => Promise<{
        success: boolean;
        canceled?: boolean;
        filePath?: string;
        message?: string;
      }>;
    };
  }
}