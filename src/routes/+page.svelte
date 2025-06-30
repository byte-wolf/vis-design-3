<script lang="ts">
	import Axis from '$lib/components/Axis.svelte';
	import * as d3 from 'd3';

	import ArrowUpRightIcon from 'lucide-svelte/icons/arrow-up-right';
	import ArrowUpIcon from 'lucide-svelte/icons/arrow-up';

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

	const tableData = $derived(data.tableData);
</script>

<h1 class="pt-2 text-4xl font-bold text-neutral-900">Key Income Data: Austria</h1>
<p class="mb-6 text-lg font-semibold text-neutral-600">From 2010 to 2022</p>

<div class="flex gap-4 pb-8">
	<div class="inline-block rounded-lg bg-[#edf7f7] px-8 py-6 text-[#1e5f5f]">
		<div class="font-semibold">Gross Income per Person</div>
		<div class="leading-3">2022</div>
		<div class="pt-4 text-3xl font-semibold">
			{Math.round(chartData[chartData.length - 1]?.grossIncomePerPerson).toLocaleString('en') ||
				'Jetz mal halblang'} €
		</div>
		<div class="flex items-center gap-1 text-[#08a0a0]">
			<ArrowUpIcon class="size-4" />
			{(
				(chartData[chartData.length - 1].grossIncomePerPerson / chartData[0].grossIncomePerPerson -
					1.0) *
				100
			).toFixed(2)} % increase over 2010
		</div>
	</div>

	<div class="inline-block rounded-lg bg-[#f7f3ff] px-8 py-6 text-[#3b2869]">
		<div class="font-semibold">Consumer Price Index (CPI)</div>
		<div class="leading-3">2022</div>
		<div class="pt-4 text-3xl font-semibold">
			{chartData[chartData.length - 1]?.vpi.toFixed(1).toLocaleString('en') || 'Jetz mal halblang'}
		</div>
		<div class="flex items-center gap-1 text-[#6929ff]">
			<ArrowUpIcon class="size-4" />
			{((chartData[chartData.length - 1].vpi / chartData[0].vpi - 1.0) * 100).toFixed(1)} % increase
			over 2010
		</div>
	</div>
</div>

<h2 class="text-xl font-bold text-neutral-900">Income Development vs. Inflation</h2>
<p class="mb-2 text-base font-semibold text-neutral-600">
	A comparison between the relative average gross income and the consumer price index (CPI)
</p>

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
				<div class="mr-0.5 h-1 w-1 rounded-l bg-[#8B5CF6]"></div>
				<div class="size-2.5 rounded-lg bg-[#8B5CF6]"></div>
				<div class="ml-0.5 h-1 w-1 rounded-r bg-[#8B5CF6]"></div>
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
			<path
				class="line-vpi"
				d={linePathVPI}
				fill="none"
				stroke="#8B5CF6"
				stroke-width="2.5"
				stroke-dasharray="5,5"
			/>

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

<div class="h-8"></div>

<h2 class="text-xl font-bold text-neutral-900">Income Increase by Industry</h2>
<p class="mb-2 text-base font-semibold text-neutral-600">
	The average increase in gross income by industry
</p>

{#if tableData}
	<div class="mt-4 inline-block overflow-hidden rounded-md bg-neutral-50 p-5">
		<table class="border border-gray-300">
			<thead class="bg-gray-100">
				<tr>
					<th class="border border-gray-300 px-4 py-1.5 text-center">ÖNACE Code</th>
					<th class="border border-gray-300 px-4 py-1.5 text-center">ÖNACE Category</th>
					<th class="border border-gray-300 px-4 py-1.5 text-center">Average Gross Income 2010</th>
					<th class="border border-gray-300 px-4 py-1.5 text-center">Average Gross Income 2022</th>
					<th class="border border-gray-300 px-4 py-1.5 text-center"
						>Average Gross Income Increase</th
					>
				</tr>
			</thead>
			<tbody>
				{#each tableData as row, i}
					<tr class={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
						<td class="border border-gray-300 px-4 py-1.5 text-center">{row.categoryCode}</td>
						<td class="border border-gray-300 px-4 py-1.5">{row.categoryName}</td>
						<td class="border border-gray-300 px-4 py-1.5 text-center">{row['2010']}</td>
						<td class="border border-gray-300 px-4 py-1.5 text-center">{row['2022']}</td>
						<td class="border border-gray-300 px-4 py-1.5 text-center">
							<div class="flex items-center justify-center gap-1 text-[#1d8b7d]">
								<ArrowUpRightIcon class="size-5" />
								<span class="pb-0.5 leading-0">{row.increase}</span>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
