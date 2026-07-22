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
- [tesseract.js](https://github.com/naptha/tesseract.js) — OCR(文字認識)
- フォント: [M+ FONTS](https://mplus-fonts.github.io/) / [Zen Maru Gothic](https://fonts.google.com/specimen/Zen+Maru+Gothic)(いずれもSIL Open Font License)

## セキュリティ・プライバシーについて

このアプリはサーバーを持たない静的サイトで、読み込んだPDF・画像はブラウザの中だけで処理されます。

- **外部への通信が一切ない**: PDFの解析・編集・パスワード付与・OCRまで、すべての処理はブラウザ内のWebAssembly/JavaScriptで完結します。フォント・CMap・OCR用データ(tesseract.js-core、日本語/英語の学習データ)もすべてこのリポジトリ内([`public/`](./public))に同梱しており、他社のCDNへ問い合わせることもありません。アップロードしたファイルの内容がインターネットに送信されることはありません。
- **サーバー・データベースがない**: 静的ファイルをホスティングしているだけなので、ファイルアップロード用のAPIや、ファイルを保存するデータベースは存在しません。攻撃対象になり得るサーバーサイドの仕組み自体がありません。
- **セキュリティヘッダー**: [`vercel.json`](./vercel.json) で Content-Security-Policy・X-Frame-Options・Strict-Transport-Security などを設定し、外部ドメインへの通信やクリックジャッキング、MIMEスニッフィングを制限しています。特に `connect-src` を自分自身のみに制限しているため、万一悪意あるスクリプトが混入しても外部にデータを送信できません。
- **依存パッケージ**: `npm audit` で既知の脆弱性がないことを確認しています。GitHubリポジトリでは [Dependabot](https://docs.github.com/ja/code-security/dependabot) を有効にしておくことを推奨します(Settings → Code security → Dependabot alerts)。
