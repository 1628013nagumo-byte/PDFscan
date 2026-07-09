/**
 * 給与明細 自動送信スクリプト
 *
 * 使い方(初心者向け):
 *   1. Googleスプレッドシートを新規作成する
 *   2. 1行目にヘッダー「番号 / 氏名 / メールアドレス」を入力し、2行目以降に
 *      名簿を入力する(番号は、PDF編集アプリで分割したときに付けた番号と
 *      一致させること。例: 「給与明細_1042.pdf」なら 1042)
 *   3. そのスプレッドシートのメニュー「拡張機能」→「Apps Script」を開く
 *   4. デフォルトで書かれているコードを全部消して、このファイルの内容を貼り付ける
 *   5. 下の CONFIG の FOLDER_ID と SENT_FOLDER_ID を、自分のGoogleドライブの
 *      フォルダIDに書き換える(フォルダIDの調べ方は下記コメント参照)
 *   6. 上部の関数選択メニューで "sendPayslips" を選び、実行ボタン(▶)を押す
 *      → 初回は権限の確認画面が出るので「許可」する
 *   7. 実行ログ(表示 → ログ)を見て、意図通りの相手に送られる予定か確認する
 *      (CONFIG.TEST_MODE が true の間は実際にはメールを送らず、ログに
 *      「送信予定」の内容だけを出力します)
 *   8. 問題なければ CONFIG.TEST_MODE を false にしてもう一度実行する
 *   9. 自動化したい場合は、左側メニューの「トリガー」(時計アイコン)から
 *      「トリガーを追加」→ 時間主導型 → 分ベースのタイマー(例: 10分おき)
 *      を選んで保存する。これで新しいファイルが自動的に処理されるようになる
 */

const CONFIG = {
  // 監視対象フォルダのID。
  // GoogleドライブでフォルダをWebブラウザで開いたときのURLの末尾部分:
  // https://drive.google.com/drive/folders/【ここがフォルダID】
  FOLDER_ID: 'ここに監視対象フォルダのIDを入力',

  // 送信済みファイルの移動先フォルダのID(二重送信を防ぐために使う)
  SENT_FOLDER_ID: 'ここに送信済みフォルダのIDを入力',

  // 名簿シートの名前(スプレッドシート下部のタブ名)
  SHEET_NAME: 'シート1',

  // 名簿シートの列番号(A列=1, B列=2, C列=3 ...)。1行目はヘッダーとして無視されます
  NUMBER_COLUMN: 1,
  NAME_COLUMN: 2,
  EMAIL_COLUMN: 3,

  // メール件名・本文({name} は名簿の氏名に置き換わります)
  EMAIL_SUBJECT: '給与明細のお知らせ',
  EMAIL_BODY: '{name} 様\n\n給与明細を送付いたします。添付のPDFファイルをご確認ください。\n\n※このメールは自動送信されています。',

  // true の間は実際にメールを送らず、ログに送信予定の内容だけを出力します。
  // 設定を確認してから false に変更してください。
  TEST_MODE: true,
}

function sendPayslips() {
  if (CONFIG.FOLDER_ID.indexOf('ここに') === 0) {
    throw new Error('CONFIG.FOLDER_ID を実際のフォルダIDに書き換えてください')
  }
  if (CONFIG.SENT_FOLDER_ID.indexOf('ここに') === 0) {
    throw new Error('CONFIG.SENT_FOLDER_ID を実際のフォルダIDに書き換えてください')
  }

  const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID)
  const sentFolder = DriveApp.getFolderById(CONFIG.SENT_FOLDER_ID)
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME)
  if (!sheet) {
    throw new Error(`シート「${CONFIG.SHEET_NAME}」が見つかりません。CONFIG.SHEET_NAME を確認してください`)
  }

  const lookup = buildLookup_(sheet)
  const files = folder.getFilesByType(MimeType.PDF)

  let sentCount = 0
  const skipped = []

  while (files.hasNext()) {
    const file = files.next()
    const fileName = file.getName()
    const number = extractNumber_(fileName)

    if (!number) {
      skipped.push(`${fileName} : ファイル名の末尾に番号が見つかりませんでした`)
      continue
    }

    const person = lookup[number]
    if (!person || !person.email) {
      skipped.push(`${fileName} : 番号「${number}」が名簿に見つかりませんでした`)
      continue
    }

    const subject = CONFIG.EMAIL_SUBJECT
    const body = CONFIG.EMAIL_BODY.replace('{name}', person.name || '')

    if (CONFIG.TEST_MODE) {
      Logger.log(`[テストモード] ${fileName} → ${person.email} (${person.name || '氏名未設定'}) に送信予定`)
    } else {
      GmailApp.sendEmail(person.email, subject, body, {
        attachments: [file.getBlob()], // ファイル名はそのまま保持されます
        name: '給与明細送信システム',
      })
      file.moveTo(sentFolder)
      Logger.log(`送信しました: ${fileName} → ${person.email}`)
      sentCount++
    }
  }

  Logger.log(`--- 完了 ---`)
  Logger.log(`送信件数: ${sentCount}${CONFIG.TEST_MODE ? '(テストモードのため実際には未送信)' : ''}`)
  if (skipped.length > 0) {
    Logger.log(`スキップしたファイル:\n${skipped.join('\n')}`)
  }
}

/** 名簿シートを読み、番号をキーにした { 番号: {name, email} } のオブジェクトを作る */
function buildLookup_(sheet) {
  const data = sheet.getDataRange().getValues()
  const lookup = {}
  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    const number = String(row[CONFIG.NUMBER_COLUMN - 1] || '').trim()
    if (!number) continue
    lookup[number] = {
      name: row[CONFIG.NAME_COLUMN - 1],
      email: String(row[CONFIG.EMAIL_COLUMN - 1] || '').trim(),
    }
  }
  return lookup
}

/** ファイル名の末尾(拡張子の直前)にある数字の並びを取り出す。例: "給与明細_1042.pdf" → "1042" */
function extractNumber_(fileName) {
  const match = fileName.match(/(\d+)\.pdf$/i)
  return match ? match[1] : null
}
