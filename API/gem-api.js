const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_GEMINI_API_KEY`;

export async function getSnackRecommendation(caloriesExpended, userPref = '') {
    const prompt = `
    あなたは栄養士です。運動で ${caloriesExpended.toFixed(2)} kcal を消費しました。
    この消費カロリーを上回らない範囲で、健康的で美味しいお菓子を具体的な製品名で3つ提案してください。
    ${userPref ? `ユーザーの好み: ${userPref}` : ''}
    提案するお菓子名、説明、カロリーを教えてください。`;

    const requestBody = { contents: [{ parts: [{ text: prompt }] }] };

    const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}