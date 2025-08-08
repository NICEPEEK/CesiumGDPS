import { round, score } from './score.js';

/**
 * Path to directory containing JSON data files
 * Исправлено: используем относительный путь 'data' вместо абсолютного '/data'
 */
const dir = 'data';

/**
 * Общая функция для загрузки списков (устранение дублирования кода)
 */
async function fetchListData(fileName) {
    try {
        const listResult = await fetch(`${dir}/${fileName}`);
        // Добавлена проверка статуса ответа
        if (!listResult.ok) {
            throw new Error(`HTTP error! status: ${listResult.status}`);
        }
        
        const list = await listResult.json();
        
        const results = await Promise.all(
            list.map(async (path, rank) => {
                try {
                    const levelResult = await fetch(`${dir}/${path}.json`);
                    // Проверка статуса для каждого уровня
                    if (!levelResult.ok) {
                        throw new Error(`HTTP error! status: ${levelResult.status}`);
                    }
                    
                    const level = await levelResult.json();
                    return [
                        {
                            ...level,
                            path,
                            records: level.records.sort(
                                (a, b) => b.percent - a.percent,
                            ),
                        },
                        null,
                    ];
                } catch (e) {
                    console.error(`Failed to load level #${rank + 1} ${path}: ${e.message}`);
                    return [null, path];
                }
            })
        );
        
        return results;
    } catch (e) {
        console.error(`Failed to load ${fileName}: ${e.message}`);
        return null;
    }
}

// Упрощенные экспорты через общую функцию
export const fetchList = () => fetchListData('_list.json');
export const fetchCHList = () => fetchListData('_chlist.json');
export const fetchPLList = () => fetchListData('_pllist.json');

export async function fetchEditors() {
    try {
        const editorsResults = await fetch(`${dir}/_editors.json`);
        // Добавлена проверка статуса
        if (!editorsResults.ok) {
            throw new Error(`HTTP error! status: ${editorsResults.status}`);
        }
        return await editorsResults.json();
    } catch (e) {
        console.error(`Failed to load editors: ${e.message}`);
        return null;
    }
}

export async function fetchLeaderboard() {
    const list = await fetchList();
    if (!list) {
        console.error("Leaderboard loading aborted: main list failed");
        return [null, ["Main list load failed"]];
    }

    const scoreMap = {};
    const errs = [];
    
    list.forEach(([level, err], rank) => {
        if (err) {
            errs.push(err);
            return;
        }

        // Verification
        const verifierKey = level.verifier.toLowerCase();
        const verifier = Object.keys(scoreMap).find(
            u => u.toLowerCase() === verifierKey
        ) || level.verifier;
        
        scoreMap[verifier] ??= {
            verified: [],
            completed: [],
            progressed: [],
        };
        
        const { verified } = scoreMap[verifier];
        verified.push({
            rank: rank + 1,
            level: level.name,
            score: score(rank + 1, 100, level.percentToQualify),
            link: level.verification,
        });

        // Records
        level.records.forEach((record) => {
            const userKey = record.user.toLowerCase();
            const user = Object.keys(scoreMap).find(
                u => u.toLowerCase() === userKey
            ) || record.user;
            
            scoreMap[user] ??= {
                verified: [],
                completed: [],
                progressed: [],
            };
            
            const { completed, progressed } = scoreMap[user];
            if (record.percent === 100) {
                completed.push({
                    rank: rank + 1,
                    level: level.name,
                    score: score(rank + 1, 100, level.percentToQualify),
                    link: record.link,
                });
                return;
            }

            progressed.push({
                rank: rank + 1,
                level: level.name,
                percent: record.percent,
                score: score(rank + 1, record.percent, level.percentToQualify),
                link: record.link,
            });
        });
    });

    const res = Object.entries(scoreMap).map(([user, scores]) => {
        const total = Object.values(scores)
            .flat()
            .reduce((prev, cur) => prev + cur.score, 0);

        return {
            user,
            total: round(total),
            ...scores,
        };
    });

    return [res.sort((a, b) => b.total - a.total), errs];
}