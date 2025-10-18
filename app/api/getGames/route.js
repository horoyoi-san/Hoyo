export async function GET(request) {
	const { searchParams } = new URL(request.url);
	const launcherParam = searchParams.get("launcher") || "";

	// แปลง launcherParam เป็น object { os, cn } รองรับ string เดิม
	let launcher;
	try {
		launcher = JSON.parse(launcherParam); // { os, cn }
		if (!launcher.os || !launcher.cn) throw new Error();
	} catch {
		launcher = { os: launcherParam, cn: launcherParam };
	}

	// URLs CN + OS
	const urls = [
		`https://hyp-api.mihoyo.com/hyp/hyp-connect/api/getGames?launcher_id=${launcher.cn}&language=zh-cn`,
		`https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGames?launcher_id=${launcher.os}&language=en-us`
	];

	const results = await Promise.allSettled(
		urls.map(url => fetch(url).then(r => r.json()))
	);

	const output = [{}];

	for (const result of results) {
		if (result.status === "fulfilled" && result.value.retcode === 0) {
			for (const game of result.value.data.games) {
				output[0][game.biz] = {
					id: game.id,
					name: game.display.name,
					icon: game.display.icon.url,
					background: game.display.background.url
				};
			}
		}
	}

	return new Response(JSON.stringify(output), {
		headers: { "Content-Type": "application/json" }
	});
}
