// 【準備1】Gemini APIの窓口（エンドポイント）を決める
// Google CloudのAI PlatformのGenerative Language APIのエンドポイントを指定します
// プロジェクトIDやリージョンはあなたの環境に合わせてください
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${YOUR_GEMINI_API_KEY}`;

// 【準備2】Geminiに送るメインの処理（非同期関数）
// 消費カロリーのデータと、もしあればユーザーからの追加情報も受け取ります
async function getSnackRecommendation(caloriesExpended, userPref = '') {

    // 【準備3】Geminiへの「質問文」（プロンプト）を作る
    // 消費カロリーの情報を具体的に渡すことで、適切な回答を引き出します
    const prompt = `
    あなたは栄養士であり、健康的な食生活をサポートするAIです。
    運動で ${caloriesExpended.toFixed(2)} kcal を消費しました。
    この消費カロリーを上回らない範囲で、健康的で美味しいお菓子を具体的な製品名で3つ提案してください。
    提案は日本語でお願いします。
    提案するお菓子名と、簡単な説明、そしておおよそのカロリーを教えてください。
    例:
    - お菓子名: プロテインバー (カカオ味)
      説明: たんぱく質が豊富で、運動後のリカバリーにも適しています。
      カロリー: 約150kcal
  `;

    // 【準備4】Geminiに送るリクエストの「注文書」を作成
    // プロンプトをJSON形式で整形します
    const requestBody = {
        contents: [
            {
                parts: [
                    {
                        text: prompt
                    }
                ]
            }
        ]
    };

    // 【実行】ここからが実際の通信
    try {
        // 【送信】Geminiのサーバーにリクエストを投げる
        // await を付けることで、返事が来るまで次の行へ行かずに「待機」します
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST', // 質問文（body）を送る時は POST を使います
            headers: {
                'Content-Type': 'application/json' // 送るデータの形式が JSON であることを伝える
            },
            body: JSON.stringify(requestBody) // JavaScriptのオブジェクトからJSON文字列に変換して送る
        });

        // レスポンスが正常かどうかをチェック
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini APIエラーレスポンス:", errorData);
            throw new Error(`Gemini APIエラー: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        // 【受信】返ってきたデータを JavaScript で使いやすい形に変換する
        const data = await response.json();

        // 【抽出】Geminiから返ってきた回答（テキスト）を抜き出す
        // Geminiのレスポンス構造に沿って、テキスト部分を抽出します
        const recommendationText = data.candidates[0].content.parts[0].text;

        // 抽出したテキストを返す
        return recommendationText;

    } catch (error) {
        console.error("Gemini APIからのアドバイス取得に失敗しました:", error);
        return "お菓子の提案を取得できませんでした。"; // エラー時に表示するメッセージ
    }
}

// 他のファイル（main.jsなど）からこの関数を使えるようにエクスポート
export { getSnackRecommendation };