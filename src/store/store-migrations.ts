export const runStoreMigrations = (importedData: any) => {
  let currentVersion = importedData.version || 0;
  const migratedData = { ...importedData };

  if (currentVersion === 0) {
    console.log("Migrating data from v0 to v1...");
    const updatedRelics = { ...migratedData.relics };

    Object.keys(updatedRelics).forEach((id) => {
      if (!updatedRelics[id].equipped_by) {
        updatedRelics[id].equipped_by = [];
      }
    });

    Object.entries(importedData.characters || {}).forEach(
      ([charId, char]: [string, any]) => {
        Object.values(char.relics).forEach((relicUid) => {
          if (relicUid && updatedRelics[relicUid as string]) {
            if (
              !updatedRelics[relicUid as string].equipped_by.includes(
                Number(charId),
              )
            ) {
              updatedRelics[relicUid as string].equipped_by.push(
                Number(charId),
              );
            }
          }
        });
      },
    );

    migratedData.relics = updatedRelics;
    currentVersion = 1;
  }

  migratedData.version = currentVersion;
  return migratedData;
};
