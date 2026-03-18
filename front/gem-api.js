// ハッカソンDemo用のモックデータ（AIが失敗した時に使用）
const MOCK_SNACKS = [
    [
        "1. ブラックサンダー: 圧倒的な満足感で約112kcal。自分へのご褒美に！",
        "2. アーモンド効果: 低カロリーで栄養満点。約39kcalです。",
        "3. 蒟蒻ゼリー(2個): 低カロリーで小腹満たしに最適。約20kcal。"
    ],
    [
        "1. 濃厚チーズインスナック: カロリー控えめながら満足度大。約100kcal。",
        "2. おしゃぶり昆布: 噛み応えがあり満足感◎。約10kcal。",
        "3. サラダチキンバー: タンパク質補給に最適。約80kcal。"
    ],
    [
        "1. 冷やし焼き芋: 食物繊維たっぷりで腹持ち抜群。約120kcal。",
        "2. 枝豆(ひとつかみ): ヘルシーで罪悪感ゼロ。約50kcal。",
        "3. カカオ70%チョコ: 集中力もアップ！約80kcal。"
    ]
];

export async function getSnackRecommendation(caloriesExpended) {
    const prompt = `あなたは栄養士です。運動で ${caloriesExpended.toFixed(2)} kcal を消費しました。
この消費カロリーを上回らない範囲で、健康的で美味しいお菓子を具体的な製品名で3つ提案してください。

出力は必ず以下のJSON形式の配列（文字列の配列）にしてください。挨拶や説明などは一切含めないでください。
[
  "1. 商品名: 理由とカロリー目安",
  "2. 商品名: 理由とカロリー目安",
  "3. 商品名: 理由とカロリー目安"
]`;

    try {
        const response = await fetch('/api/gemini/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt })
        });

        if (!response.ok) {
            console.warn("Backend API failed, using mock data. Status:", response.status);
            return MOCK_SNACKS[Math.floor(Math.random() * MOCK_SNACKS.length)];
        }

        const data = await response.json();
        const text = data.response;

        if (!text) throw new Error("No response text");

        const jsonMatch = text.match(/\[[\s\S]*\]/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : text.split('\n').filter(l => l.length > 5).slice(0, 3);

    } catch (error) {
        console.warn("Communication error, using mock data:", error);
        return MOCK_SNACKS[Math.floor(Math.random() * MOCK_SNACKS.length)];
    }
}