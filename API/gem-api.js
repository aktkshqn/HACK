const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_GEMINI_API_KEY`;

/**
 * Geminiからカロリーに応じたお菓子を提案してもらう関数
 * @param {number} caloriesExpended - 消費カロリー
 * @param {string} userPref - ユーザーの好み(任意)
 * @returns {Promise<string>} - AIからの回答テキスト
 */
export async function getSnackRecommendation(caloriesExpended, userPref = '') {
    const prompt = `
    あなたは栄養士です。運動で ${caloriesExpended.toFixed(2)} kcal を消費しました。
    この消費カロリーを上回らない範囲で、健康的で美味しいお菓子を具体的な製品名で3つ提案してください。
    提案は日本語でお願いします。
    ${userPref ? `ユーザーの好み: ${userPref}` : ''}
    提案するお菓子名と、簡単な説明、そしておおよそのカロリーを教えてください。
    `;

    const requestBody = { contents: [{ parts: [{ text: prompt }] }] };

    const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}