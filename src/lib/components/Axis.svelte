<script lang="ts">
	import * as d3 from 'd3';

	interface Props {
		scale: d3.ScaleLinear<number, number>;
		transform: string;
		axisFn: 'axisBottom' | 'axisLeft' | 'axisRight';
		ticks?: number;
		innerWidth?: number;
	}

	let g: SVGGElement;
	let { scale, transform, axisFn, ticks, innerWidth = 600 }: Props = $props();

	// `$effect` will re-run whenever `scale` changes.
	// This ensures the axis updates when the data or dimensions change.
	$effect(() => {
		if (g) {
			const axis = d3[axisFn](scale);

			if (ticks) {
				axis.ticks(ticks);
			}

			// Spezifische Formatierungen für jede Achsenart
			if (axisFn === 'axisLeft') {
				axis
					.tickSize(-innerWidth)
					.tickFormat((d) => `${d}`)
					.tickPadding(15);
			} else if (axisFn === 'axisRight') {
				axis
					.tickSize(-innerWidth)
					.tickFormat((d) => `${d}`)
					.tickPadding(15);
			} else if (axisFn === 'axisBottom') {
				axis.tickFormat(d3.format('d')).tickPadding(10);
			}

			d3.select(g).call(axis as any);

			// Einheitliche Stile nach dem Aufruf
			d3.select(g).select('.domain').attr('stroke', 'none');
			d3.select(g).selectAll('.tick line').attr('stroke', '#e0e0e0');
		}
	});
</script>

<g bind:this={g} {transform} />
