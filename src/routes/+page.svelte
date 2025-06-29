<script lang="ts">
	import Axis from '$lib/components/Axis.svelte';
	import * as d3 from 'd3';

	const { data } = $props();

	let chartData = $state(data.chartData);

	let width = $state(900);
	let height = $state(500);
	const margins = $state({
		top: 50,
		right: 40,
		bottom: 50,
		left: 60
	});

	const innerWidth = $derived(width - margins.left - margins.right);
	const innerHeight = $derived(height - margins.top - margins.bottom);

	// The X scale maps years to horizontal pixels.
	const xScale = $derived(
		d3
			.scaleLinear()
			// d3.extent gets the min and max year from our data
			.domain(d3.extent(chartData, (d) => d.year) as [number, number])
			.range([0, innerWidth])
	);

	// Linke Y-Skala für das Bruttoeinkommen (bleibt gleich)
	const yScaleIncome = $derived(
		d3
			.scaleLinear()
			.domain([0, d3.max(chartData, (d) => d.grossIncomePerPerson) as number])
			.range([innerHeight, 0])
			.nice()
	);

	// NEU: Rechte Y-Skala für den Verbraucherpreisindex (VPI)
	const yScaleVPI = $derived(
		d3
			.scaleLinear()
			.domain(d3.extent(chartData, (d) => d.vpi) as [number, number])
			.range([innerHeight, 0])
			.nice()
	);

	// Generator für die Einkommenslinie
	const lineGeneratorIncome = $derived(
		d3
			.line<(typeof chartData)[0]>()
			.x((d) => xScale(d.year))
			.y((d) => yScaleIncome(d.grossIncomePerPerson))
			.curve(d3.curveMonotoneX)
	);
	const linePathIncome = $derived(lineGeneratorIncome(chartData));

	// NEU: Generator für die VPI-Linie
	const lineGeneratorVPI = $derived(
		d3
			.line<(typeof chartData)[0]>()
			.x((d) => xScale(d.year))
			.y((d) => yScaleVPI(d.vpi || 100)) // `d.vpi!` ist sicher, da wir oben gefiltert haben
			.curve(d3.curveMonotoneX)
	);
	const linePathVPI = $derived(lineGeneratorVPI(chartData));
</script>

<div class="chart-container">
	<h1 class="chart-title">Einkommensentwicklung vs. Inflation (VPI)</h1>

	<svg {width} {height} class="chart-svg">
		<g transform="translate({margins.left}, {margins.top})">
			<!-- NEU: Legende -->
			<g class="legend" transform="translate(0, -25)">
				<circle cx="0" cy="0" r="5" fill="#1155ff"></circle>
				<text x="10" y="5">Bruttoeinkommen p.P.</text>
				<circle cx="180" cy="0" r="5" fill="#ff6f61"></circle>
				<text x="190" y="5">Verbraucherpreisindex (VPI)</text>
			</g>

			<!-- Achsen -->
			<Axis
				scale={xScale}
				transform="translate(0, {innerHeight})"
				axisFn="axisBottom"
				ticks={chartData.length}
			/>
			<Axis
				scale={yScaleIncome}
				transform="translate(0,0)"
				axisFn="axisLeft"
				{innerWidth}
				ticks={10}
			/>
			<!-- NEU: Rechte Y-Achse für den VPI -->
			<Axis
				scale={yScaleVPI}
				transform="translate({innerWidth}, 0)"
				axisFn="axisRight"
				ticks={10}
				{innerWidth}
			/>

			<!-- Achsenbeschriftungen -->
			<text class="axis-label" x={innerWidth / 2} y={innerHeight + 40} text-anchor="middle">
				Jahr
			</text>
			<text
				class="axis-label"
				transform="rotate(-90)"
				y={-margins.left + 20}
				x={-innerHeight / 2}
				text-anchor="middle"
			>
				Bruttoeinkommen pro Person (€)
			</text>
			<!-- NEU: Rechte Achsenbeschriftung -->
			<text
				class="axis-label"
				transform="rotate(90)"
				y={-width + margins.right}
				x={innerHeight / 2}
				text-anchor="middle"
			>
				Verbraucherpreisindex (VPI)
			</text>

			<!-- Datenlinien -->
			<path class="line" d={linePathIncome} fill="none" stroke="#1155ff" stroke-width="2.5" />
			<!-- NEU: VPI-Linie -->
			<path class="line-vpi" d={linePathVPI} fill="none" stroke="#ff6f61" stroke-width="2.5" />

			<!-- Datenpunkte (Kreise) -->
			{#each chartData as d (d.year)}
				<!-- Einkommens-Punkte -->
				<circle cx={xScale(d.year)} cy={yScaleIncome(d.grossIncomePerPerson)} r="4" fill="#1155ff">
					<title>
						Jahr: {d.year}\nBruttoeinkommen: {d.grossIncomePerPerson.toFixed(2)}€
					</title>
				</circle>

				<!-- NEU: VPI-Punkte -->
				<circle cx={xScale(d.year)} cy={yScaleVPI(d.vpi || 100)} r="4" fill="#ff6f61">
					<title>Jahr: {d.year}\nVPI: {d.vpi?.toFixed(2) || 0}</title>
				</circle>
			{/each}
		</g>
	</svg>
</div>

{#if chartData}
	<div class="mt-4">
		<p class="mb-2">Loaded {chartData.length} records from income.csv</p>

		<!-- Display first few rows as a preview -->
		<div class="overflow-x-auto">
			<table class="min-w-full border border-gray-300">
				<thead class="bg-gray-50">
					<tr>
						{#each Object.keys(chartData[0]) as header}
							<th class="border border-gray-300 px-4 py-2 text-left">{header}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each chartData.slice(0, 15) as row, i}
						<tr class={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
							{#each Object.values(row) as value}
								<td class="border border-gray-300 px-4 py-2"
									>{typeof value === 'number' ? value.toLocaleString() : value}</td
								>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if chartData.length > 15}
			<p class="mt-2 text-gray-600">Showing first 15 of {chartData.length} records</p>
		{/if}
	</div>
{:else}
	<p class="mt-4 text-red-600">No income data available</p>
{/if}
