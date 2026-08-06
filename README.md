# AI Lottery Lab Professional 5.0.0

ロト6・ロト7の予想、購入5口保存、公式確認済み結果との自動照合、特徴量レポート、CSV出力を統合したiPhone対応版です。

## データ同期
`.github/workflows/sync-lottery.yml` がPayPay銀行の過去10回号ページをブラウザ実行で確認し、検証済み結果だけを `latest.json` に保存します。自動取得失敗時はActionsの手動入力で公式照合済み番号を登録できます。

未確認データ・推測値・予想値は当せん結果として使用しません。
