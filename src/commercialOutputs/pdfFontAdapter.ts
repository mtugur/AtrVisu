import fontkit from "@pdf-lib/fontkit";
import type { PDFDocument, PDFFont } from "pdf-lib";
import notoSansBoldDataUrl from "./fonts/NotoSans-Bold.ttf?inline";
import notoSansRegularDataUrl from "./fonts/NotoSans-Regular.ttf?inline";

export const COMMERCIAL_PDF_FONT_AUTHORITY = Object.freeze({
  family: "Noto Sans",
  regularSource: "notofonts/noto-fonts hinted/ttf/NotoSans/NotoSans-Regular.ttf",
  boldSource: "notofonts/noto-fonts hinted/ttf/NotoSans/NotoSans-Bold.ttf",
  license: "SIL Open Font License 1.1",
  licenseFile: "src/commercialOutputs/fonts/OFL.txt"
});

export type CommercialPdfFonts = Readonly<{
  regular: PDFFont;
  bold: PDFFont;
}>;

const decodeInlineFont = (dataUrl: string) => {
  const separatorIndex = dataUrl.indexOf(",");
  if (separatorIndex < 0 || !dataUrl.slice(0, separatorIndex).endsWith(";base64")) {
    throw new Error("Commercial PDF font asset is not an inline base64 resource.");
  }
  const binary = atob(dataUrl.slice(separatorIndex + 1));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

export const embedCommercialPdfFonts = async (document: PDFDocument): Promise<CommercialPdfFonts> => {
  document.registerFontkit(fontkit);
  const [regular, bold] = await Promise.all([
    document.embedFont(decodeInlineFont(notoSansRegularDataUrl), { subset: true }),
    document.embedFont(decodeInlineFont(notoSansBoldDataUrl), { subset: true })
  ]);
  return Object.freeze({ regular, bold });
};
