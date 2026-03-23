export {};

declare global {
  interface Window {
    electronAPI: {
      // 라이센스 관련
      getHardwareId: () => Promise<string>;
      getLicenseStatus: () => Promise<{ status: string }>;
      validateAndSaveLicense: (key: string) => Promise<{ success: boolean }>;
      clearLicense: () => Promise<{ success: boolean }>;

      // 저장 다이얼로그
      showSaveDialog: (options: {
        defaultFileName?: string;
        filters?: {
          name: string;
          extensions: string[];
        }[];
      }) => Promise<{
        canceled: boolean;
        filePath?: string;
      }>;

      // 파일 저장
      saveBinaryFile: (payload: {
        filePath: string;
        data: number[];
      }) => Promise<{ success: boolean }>;

      // PDF 저장
      savePDF: (
        html: string,
        defaultFileName?: string
      ) => Promise<{
        success?: boolean;
        canceled?: boolean;
      }>;
    };
  }
}