export async function GET(request) {
	const { searchParams } = new URL(request.url);
	let launcherIdParam = searchParams.get("launcher");

	// ถ้ามีส่ง launcher มาจาก client ก็ใช้ค่านั้น
	// ถ้าไม่มี ใช้ launcherId ทั้งสองแบบ (CN + OS)
	const launcherIds = typeof launcherIdParam === "string"
		? { os: launcherIdParam, cn: launcherIdParam }
		: { os: "jGHBHlcOq1", cn: "gU7BCkj29M" };

	// ดึงข้อมูลจากทั้ง CN และ OS พร้อมกัน
	const urls = [
		`https://hyp-api.mihoyo.com/hyp/hyp-connect/api/getGames?launcher_id=${launcherIds.cn}&language=en-us`,
		`https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGames?launcher_id=${launcherIds.os}&language=en-us`
	];

	try {
		const responses = await Promise.all(urls.map(url => fetch(url)));
		const jsonResults = await Promise.all(responses.map(r => r.json()));

		let output = [{}];

		// รวมผลลัพธ์จากทั้งสองฝั่ง
		for (const data of jsonResults) {
			if (data.retcode !== 0) continue;
			for (const game of data.data.games) {
				output[0][game.biz] = {
					id: game.id,
					name: game.display.name,
					icon: game.display.icon.url,
					background: game.display.background.url
				};
			}
		}

		return new Response(JSON.stringify(output));
	} catch (error) {
		return new Response(JSON.stringify({ error: error.message }));
	}
}
