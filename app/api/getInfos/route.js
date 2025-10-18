export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const launcherId = searchParams.get("launcher");
    const gameId = searchParams.get("game");

    const sophonGamescn = ["1Z8W5NHUQb"]; // hk4e CN
    const sophonGamesos = ["gopR6Cufr3"]; // hk4e OS

    let sophon = false;

    // เตรียม URL ทั้ง CN และ OS
    let urls = [
        `https://hyp-api.mihoyo.com/hyp/hyp-connect/api/getGamePackages?game_ids[]=${gameId}&launcher_id=${launcherId}`,
        `https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages?game_ids[]=${gameId}&launcher_id=${launcherId}`
    ];

    // ถ้าเป็น Sophon จะเปลี่ยน endpoint เป็น getGameBranches
    if (sophonGamescn.includes(gameId)) {
        sophon = true;
        urls[0] = `https://hyp-api.mihoyo.com/hyp/hyp-connect/api/getGameBranches?game_ids[]=${gameId}&launcher_id=${launcherId}`;
    }
    if (sophonGamesos.includes(gameId)) {
        sophon = true;
        urls[1] = `https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGameBranches?game_ids[]=${gameId}&launcher_id=${launcherId}`;
    }

    // ดึงข้อมูลจากทั้งสอง API พร้อมกัน
    const results = await Promise.allSettled(urls.map(url => fetch(url).then(r => r.json())));

    // เอาข้อมูลที่ดึงได้จริง (ไม่ error)
    const validData = results
        .filter(r => r.status === "fulfilled" && r.value.retcode === 0)
        .map(r => r.value);

    if (validData.length === 0) {
        return new Response(JSON.stringify({ error: "No valid data" }), { status: 500 });
    }

    // ใช้ข้อมูลตัวแรกเป็นหลัก (หรือจะรวมทั้งคู่ก็ได้)
    let data = validData[0];

    // ======================= SOPHON =======================
    if (sophon) {
        let latestTag = data.data.game_branches[0].main.tag;
        latestTag = latestTag.replace(/(\d+\.\d+)\.\d+$/, "$1");

        const sophonData = [{
            "sophon": true,
            "current": {
                "major": {
                    "version": latestTag,
                    "game_pkgs": [[gameId, latestTag, "game", "full"]],
                    "audio_pkgs": {
                        "en-us": [gameId, latestTag, "en-us", "full"],
                        "ja-jp": [gameId, latestTag, "ja-jp", "full"],
                        "ko-kr": [gameId, latestTag, "ko-kr", "full"],
                        "zh-cn": [gameId, latestTag, "zh-cn", "full"]
                    }
                },
                "patches": []
            },
            "pre_download": { "major": null, "patches": [] }
        }];

        for (const elem of data.data.game_branches[0].main.diff_tags) {
            sophonData[0].current.patches.push({
                "version": elem.replace(/(\d+\.\d+)\.\d+$/, "$1"),
                "game_pkgs": [[gameId, latestTag, "game", "update"]],
                "audio_pkgs": {
                    "en-us": [gameId, latestTag, "en-us", "update"],
                    "ja-jp": [gameId, latestTag, "ja-jp", "update"],
                    "ko-kr": [gameId, latestTag, "ko-kr", "update"],
                    "zh-cn": [gameId, latestTag, "zh-cn", "update"]
                }
            });
        }

        return new Response(JSON.stringify(sophonData), {
            headers: { "Content-Type": "application/json" }
        });
    }

    // ======================= ปกติ =======================
    function modifyVersions(obj) {
        for (const key in obj) {
            if (obj[key] && typeof obj[key] === "object") modifyVersions(obj[key]);
            if (key === "version" && typeof obj[key] === "string")
                obj[key] = obj[key].replace(/(\d+\.\d+)\.\d+$/, "$1");
        }
        return obj;
    }

    data = modifyVersions(data);

    const output = [{
        "sophon": false,
        "current": data.data.game_packages[0].main,
        "pre_download": data.data.game_packages[0].pre_download
    }];

    function convertAudioPkgs(arr) {
        const res = {};
        arr.forEach(p => res[p.language] = {
            url: p.url, md5: p.md5, size: p.size, decompressed_size: p.decompressed_size
        });
        return res;
    }

    const curr = output[0].current;
    curr.major.audio_pkgs = convertAudioPkgs(curr.major.audio_pkgs);
    curr.patches.forEach(p => p.audio_pkgs = convertAudioPkgs(p.audio_pkgs));

    if (output[0].pre_download?.major) {
        output[0].pre_download.major.audio_pkgs = convertAudioPkgs(output[0].pre_download.major.audio_pkgs);
        output[0].pre_download.patches.forEach(p => p.audio_pkgs = convertAudioPkgs(p.audio_pkgs));
    }

    function removeResListUrl(obj) {
        if (Array.isArray(obj)) return obj.map(removeResListUrl);
        if (obj && typeof obj === "object") {
            const newObj = {};
            for (const key in obj) {
                if (key !== "res_list_url") newObj[key] = removeResListUrl(obj[key]);
            }
            return newObj;
        }
        return obj;
    }

    const cleaned = removeResListUrl(output);

    return new Response(JSON.stringify(cleaned), {
        headers: { "Content-Type": "application/json" }
    });
}
