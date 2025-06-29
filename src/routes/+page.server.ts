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
        }));

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
                    grossIncomePerEntity: grossIncomePerEntity / sumTotalEntities
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
        })).sort((a, b) => a.year - b.year).filter(d => d.year >= 2010);

        // Für einen schnellen Zugriff wandeln wir die VPI-Daten in eine Map um: { year => indexValue }
        const vpiMap = new Map(vpiData.map(d => [d.year, d.indexValue]));

        // Wir nehmen die Einkommensdaten als Basis und fügen die VPI-Werte hinzu
        const combinedData = yearlyIncomeData.map(incomeItem => {
            const vpiValue = vpiMap.get(incomeItem.year);
            return {
                ...incomeItem,
                vpi: vpiValue ?? null // Füge den VPI-Jahreswert hinzu
            };
        });

        return {
            chartData: combinedData
        };
    } catch (error) {
        console.error('Error loading income data:', error);
        return {
            chartData: []
        };
    }
};