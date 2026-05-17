declare module "pdfmake/build/pdfmake" {
  const pdfMake: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createPdf(docDefinition: any): {
      open(): void;
      download(filename?: string): void;
      getBase64(callback: (data: string) => void): void;
      getBuffer(callback: (buffer: Buffer) => void): void;
      getBlob(callback: (blob: Blob) => void): void;
      getDataUrl(callback: (dataUrl: string) => void): void;
    };
    /** 0.2.x virtual filesystem: maps font filename → base64 string */
    vfs: Record<string, string>;
    fonts: Record<string, { normal?: string; bold?: string; italics?: string; bolditalics?: string }>;
  };
  export default pdfMake;
  export = pdfMake;
}

declare module "pdfmake/build/vfs_fonts" {
  const vfsFonts: {
    pdfMake: { vfs: Record<string, string> };
  };
  export default vfsFonts;
  export = vfsFonts;
}
