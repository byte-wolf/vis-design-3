<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	$: incomeData = data.incomeData;
</script>

<h1 class="text-2xl font-bold">Income and cost of living</h1>

{#if incomeData}
	<div class="mt-4">
		<p class="mb-2">Loaded {incomeData.length} records from income.csv</p>

		<!-- Display first few rows as a preview -->
		<div class="overflow-x-auto">
			<table class="min-w-full border border-gray-300">
				<thead class="bg-gray-50">
					<tr>
						{#each Object.keys(incomeData[0]) as header}
							<th class="border border-gray-300 px-4 py-2 text-left">{header}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each incomeData.slice(0, 10) as row, i}
						<tr class={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
							{#each Object.values(row) as value}
								<td class="border border-gray-300 px-4 py-2">{value}</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if incomeData.length > 10}
			<p class="mt-2 text-gray-600">Showing first 10 of {incomeData.length} records</p>
		{/if}
	</div>
{:else}
	<p class="mt-4 text-red-600">No income data available</p>
{/if}
