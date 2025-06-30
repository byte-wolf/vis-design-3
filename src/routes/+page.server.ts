import * as d3 from 'd3';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    try {
        const incomePath = 'src/lib/data/income.csv';
        const vpiPath = 'src/lib/data/vpi.csv';

        const incomeFile = Bun.file(incomePath);
        const vpiFile = Bun.file(vpiPath);

        const incomeCsv = await incomeFile.text();
        const vpiCsv = await vpiFile.text();

        const incomeData = d3.dsvFormat(';').parse(incomeCsv);
        const vpiData = d3.dsvFormat(';').parse(vpiCsv, (d) => {
            const period = d['C-VPIZR-0'];
            if (!period) return null;

            const datePart = period.substring(6); // Extrahiert '2012' oder '201212'

            // Die entscheidende Filterbedingung:
            // 1. Nur der Gesamtindex ('VPI-0')
            // 2. Nur Jahreswerte (Länge 4)
            if (d['C-VPI5-0'] === 'VPI-0' && datePart.length === 4) {
                return {
                    year: parseInt(datePart, 10),
                    indexValue: parseFloat(d['F-VPIMZBM']?.replace(',', '.') || '0')
                };
            }

            // Alle anderen Zeilen (Monatswerte, andere Kategorien) werden ignoriert
            return null;
        });

        const processedRows = incomeData.map(row => ({
            year: parseInt(row['C-A10-0'].substring(4)),
            grossIncome: parseInt(row['F-KZ210']),
            netIncome: parseInt(row['F-NBEZ']),
            totalEntities: parseInt(row['F-Z_INSGES']),
            duration: parseInt(row['C-BEZD_2-0']),
            category: parseInt(row['C-LOENACE_08_1-0']),
        })).filter(d => d.year >= 2010);

        const groupedByYear = d3.rollup(
            processedRows,
            (v) => {
                // v is an array of all rows for a given year.
                // Calculate the sum of F-NBEZ for the group
                const totalNetIncome = d3.sum(v, (d) => d.netIncome);
                const totalGrossIncome = d3.sum(v, (d) => d.grossIncome);
                // Calculate the sum of F-Z_INSGES for the group
                const netIncomePerEntity = d3.sum(v, (d) => d.netIncome);
                const grossIncomePerEntity = d3.sum(v, (d) => d.grossIncome);

                const sumTotalEntities = d3.sum(v, (d) => d.totalEntities);

                return {
                    totalEntities: sumTotalEntities,
                    totalNetIncome: totalNetIncome,
                    totalGrossIncome: totalGrossIncome,
                    netIncomePerEntity: netIncomePerEntity / sumTotalEntities,
                    grossIncomePerEntity: grossIncomePerEntity / sumTotalEntities,
                };
            },
            (d) => d.year // The key to group by
        );

        const yearlyIncomeData = Array.from(groupedByYear, ([year, value]) => ({
            year,
            totalEntities: value.totalEntities,
            grossIncomePerPerson: value.grossIncomePerEntity,
            netIncomePerPerson: value.netIncomePerEntity,
            totalNetIncome: value.totalNetIncome,
            totalGrossIncome: value.totalGrossIncome
        })).sort((a, b) => a.year - b.year);

        const baseGrossIncome = yearlyIncomeData[0]?.grossIncomePerPerson;

        // Für einen schnellen Zugriff wandeln wir die VPI-Daten in eine Map um: { year => indexValue }
        const vpiMap = new Map(vpiData.map(d => [d.year, d.indexValue]));

        // Wir nehmen die Einkommensdaten als Basis und fügen die VPI-Werte hinzu
        const combinedData = yearlyIncomeData.map(incomeItem => {
            const vpiValue = vpiMap.get(incomeItem.year);
            const indexedGrossIncome = baseGrossIncome ? (incomeItem.grossIncomePerPerson / baseGrossIncome) * 100 : 100;
            return {
                ...incomeItem,
                vpi: vpiValue ?? 100, // Füge den VPI-Jahreswert hinzu
                indexedGrossIncome
            };
        });


        const grouped2010 = d3.rollup(
            processedRows.filter(d => d.year == 2010 && d.category != 400000),
            (v) => {
                const totalGrossIncome = d3.sum(v, (d) => d.grossIncome);
                const sumTotalEntities = d3.sum(v, (d) => d.totalEntities);
                return {
                    grossIncomePerEntity: totalGrossIncome / sumTotalEntities,
                };
            },
            (d) => d.category // The key to group by
        );

        const grouped2022 = d3.rollup(
            processedRows.filter(d => d.year == 2022 && d.category != 400000),
            (v) => {
                const totalGrossIncome = d3.sum(v, (d) => d.grossIncome);
                const sumTotalEntities = d3.sum(v, (d) => d.totalEntities);
                return {
                    grossIncomePerEntity: totalGrossIncome / sumTotalEntities,
                    category: v[0].category
                };
            },
            (d) => d.category // The key to group by
        );

        const data2010 = Array.from(grouped2010, ([category, value]) => {
            const categoryName: string = categoryCodes[category.toString()];
            return {
                category,
                categoryName: categoryName,
                grossIncomePerEntity: value.grossIncomePerEntity,
            }
        }).sort((a, b) => a.category - b.category);

        const data2022 = Array.from(grouped2022, ([category, value]) => {
            const categoryName: string = categoryCodes[category.toString()];
            return {
                category,
                categoryName: categoryName,
                grossIncomePerEntity: value.grossIncomePerEntity,
            }
        }).sort((a, b) => a.category - b.category);

        const tableData = data2010.map((k, i) => ({
            category: k.category,
            categoryCode: k.categoryName.slice(-2, -1),
            categoryName: k.categoryName.slice(0, -4),
            2010: Math.round(k.grossIncomePerEntity).toLocaleString() + " €",
            2022: Math.round(data2022[i]?.grossIncomePerEntity)?.toLocaleString() + " €",
            increase: Math.round((data2022[i]?.grossIncomePerEntity - k.grossIncomePerEntity) / k.grossIncomePerEntity * 100) + " %"
        }));

        return {
            chartData: combinedData,
            tableData: tableData,
        };
    } catch (error) {
        console.error('Error loading income data:', error);
        return {
            chartData: []
        };
    }
};

const categoryCodes = {
    "400001":
        "Land- und Forstwirtschaft; Fischerei <A>",

    "400002":
        "Bergbau u.Gewinnung v.Steinen u.Erden <B>",

    "400003":
        "Herstellung von Waren <C>",

    "400004":
        "Energieversorgung <D>",

    "400005":
        "Wasservers.-u.-entsorg.;Abfallentsorgung <E>",

    "400006":
        "Bau <F>",

    "400007":
        "Handel; Rep. und Instandh. von Kfz <G>",

    "400008":
        "Verkehr und Lagerei <H>",

    "400009":
        "Beherbergung und Gastronomie <I>",

    "400010":
        "Information und Kommunikation <J>",

    "400011":
        "Erbring.v.Finanz-u.Versicherungsleist. <K>",

    "400012":
        "Grundstücks- und Wohnungswesen <L>",

    "400013":
        "Erbring.v.freiberuf.,wissensch.,techn.DL <M>",

    "400014":
        "Erbring.v.sonst. wirtschaftl.Dienstl. <N>",

    "400015":
        "Öffentliche Verwalt., Sozialversicherung <O>",

    "400016":
        "Erziehung und Unterricht <P>",

    "400017":
        "Gesundheits- und Sozialwesen <Q>",

    "400018":
        "Kunst, Unterhaltung und Erholung <R>",

    "400019":
        "Erbringung v. sonstigen Dienstleistungen <S>",

    "400020":
        "Private Haushalte <T>",

    "400021":
        "Exterritoriale Organisationen <U>",

} as any;