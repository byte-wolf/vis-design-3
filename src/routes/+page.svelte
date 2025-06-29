<script lang="ts">
	import Axis from '$lib/components/Axis.svelte';
	import * as d3 from 'd3';

	// --- 1. DATA AND DIMENSIONS ---
	const { data } = $props();
	// Filter out any data points where VPI or the new indexed income might be missing
	let chartData = $state(
		data.chartData.filter((d) => d.vpi != null && d.indexedGrossIncome != null)
	);

	let width = $state(900);
	let height = $state(500);
	const margins = $state({ top: 30, right: 40, bottom: 65, left: 65 });

	const innerWidth = $derived(width - margins.left - margins.right);
	const innerHeight = $derived(height - margins.top - margins.bottom);

	const xScale = $derived(
		d3
			.scaleLinear()
			.domain(d3.extent(chartData, (d) => d.year) as [number, number])
			.range([0, innerWidth])
	);

	// --- 2. UNIFIED Y-SCALE ---
	// A single Y-scale for both indexed income and VPI, as they share a base of 100.
	const yDomain = $derived(() => {
		if (chartData.length === 0) return [80, 120]; // Default domain
		const allValues = chartData.flatMap((d) => [d.indexedGrossIncome, d.vpi ?? 100]);
		return d3.extent(allValues) as [number, number];
	});

	const yScale = $derived(
		d3
			.scaleLinear()
			.domain(yDomain() as [number, number])
			.range([innerHeight, 0])
			.nice()
	);

	// --- 3. LINE GENERATORS ---
	const lineGeneratorIncome = $derived(
		d3
			.line<(typeof chartData)[0]>()
			.x((d) => xScale(d.year))
			.y((d) => yScale(d.indexedGrossIncome))
			.curve(d3.curveMonotoneX)
	);
	const linePathIncome = $derived(lineGeneratorIncome(chartData));

	const lineGeneratorVPI = $derived(
		d3
			.line<(typeof chartData)[0]>()
			.x((d) => xScale(d.year))
			.y((d) => yScale(d.vpi || 100))
			.curve(d3.curveMonotoneX)
	);
	const linePathVPI = $derived(lineGeneratorVPI(chartData));
</script>

<h1 class="pt-2 text-2xl leading-5 font-bold text-neutral-900">
	Income Development vs. Inflation (CPI)
</h1>
<p class="mb-4 text-base font-semibold text-neutral-500">From 2010 to 2022</p>

<div class="chart-container inline-block rounded-md bg-neutral-50 p-2">
	<div class="flex gap-4 rounded p-2" style="width: {width}px">
		<div class="flex items-center gap-2 rounded-md bg-[#e8f8f6] px-2">
			<div class="flex items-center">
				<div class="h-1 w-1 rounded-l bg-[#2DD4BF]"></div>
				<div class="size-2.5 rounded-lg bg-[#2DD4BF]"></div>
				<div class="h-1 w-1 rounded-r bg-[#2DD4BF]"></div>
			</div>
			<p class="pb-0.5 font-semibold text-[#115046]">Average Gross Income</p>
		</div>

		<div class="flex items-center gap-2 rounded-md bg-[#f4f0ff] px-2">
			<div class="flex items-center">
				<div class="h-1 w-1 rounded-l bg-[#8B5CF6]"></div>
				<div class="size-2.5 rounded-lg bg-[#8B5CF6]"></div>
				<div class="h-1 w-1 rounded-r bg-[#8B5CF6]"></div>
			</div>
			<p class="pb-0.5 font-semibold text-[#34235a]">Consumer Price Index (CPI)</p>
		</div>
	</div>

	<svg {width} {height} class="chart-svg">
		<g transform="translate({margins.left}, {margins.top})">
			<!-- Achsen -->
			<Axis
				scale={xScale}
				transform="translate(0, {innerHeight})"
				axisFn="axisBottom"
				ticks={chartData.length}
			/>
			<Axis scale={yScale} transform="translate(0,0)" axisFn="axisLeft" {innerWidth} ticks={10} />

			<!-- Achsenbeschriftungen -->
			<text class="axis-label" x={innerWidth / 2} y={innerHeight + 50} text-anchor="middle">
				Year
			</text>
			<text
				class="axis-label"
				transform="rotate(-90)"
				y={-margins.left + 20}
				x={-innerHeight / 2}
				text-anchor="middle"
			>
				Index (Base {chartData[0]?.year})
			</text>

			<!-- Datenlinien -->
			<path class="line" d={linePathIncome} fill="none" stroke="#2DD4BF" stroke-width="2.5" />
			<path class="line-vpi" d={linePathVPI} fill="none" stroke="#8B5CF6" stroke-width="2.5" />

			<!-- Datenpunkte (Kreise) -->
			{#each chartData as d (d.year)}
				<!-- Einkommens-Punkte -->
				<circle cx={xScale(d.year)} cy={yScale(d.indexedGrossIncome)} r="3" fill="#2DD4BF">
					<title>
						Year: {d.year}\nEinkommens-Index: {d.indexedGrossIncome.toFixed(2)}
					</title>
				</circle>

				<!-- VPI-Punkte -->
				<circle cx={xScale(d.year)} cy={yScale(d.vpi || 100)} r="3" fill="#8B5CF6">
					<title>Year: {d.year}\nVPI: {d.vpi?.toFixed(2) || 0}</title>
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
