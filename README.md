# PDF編集アプリ

ブラウザだけで動くPDF編集ツールです。ファイルはサーバーに送信されず、すべてブラウザ内で処理されます。

## 主な機能

- 複数PDFの結合・ページ単位の分割
- パスワード保護(AES-256暗号化)されたPDFの書き出し
- テキスト・画像・図形(四角形/楕円/直線)・チェックボックスの追加
- 図形の色や透明度の調整

## 開発環境での起動方法

```bash
npm install
npm run dev
```

## 本番用ビルド

```bash
npm run build
```

`dist` フォルダに静的ファイルが生成されます。Vercelなどの静的ホスティングサービスにそのままデプロイできます。

## 技術スタック

- React + TypeScript + Vite
- [pdf-lib](https://github.com/Hopding/pdf-lib) — PDFの結合・分割・要素の描画
- [pdf.js](https://mozilla.github.io/pdf.js/) — PDFページのプレビュー表示
- [mupdf](https://mupdf.readthedocs.io/) — パスワード保護(AES-256暗号化)
- フォント: [M+ FONTS](https://mplus-fonts.github.io/)(SIL Open Font License)
