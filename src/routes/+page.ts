import * as d3 from 'd3';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
    try {
        const incomePath = 'src/lib/data/income.csv';
        const headersPath = 'src/lib/data/headers.csv';

        const incomeFile = Bun.file(incomePath);
        const headersFile = Bun.file(headersPath);

        const incomeCsv = await incomeFile.text();
        const headersCsv = await headersFile.text();

        const headersData = d3.dsvFormat(';').parse(headersCsv);
        const headerMapping: Record<string, string> = {};

        headersData.forEach(row => {
            if (row.code && row.en_name) {
                headerMapping[row.code] = row.name;
            }
        });

        const incomeData = d3.dsvFormat(';').parse(incomeCsv);

        const processedData = incomeData.map(row => {
            const newRow: Record<string, any> = {};

            Object.keys(row).forEach(germanKey => {
                const englishKey = headerMapping[germanKey] || germanKey;
                newRow[englishKey] = row[germanKey];
            });

            return newRow;
        });

        return {
            incomeData: processedData
        };
    } catch (error) {
        console.error('Error loading income data:', error);
        return {
            incomeData: []
        };
    }
};