<template>
	<button
		ref="button"
		class="ui-button"
		:class="{ [`ui-button--${bg}`]: true, [`ui-button--${size}`]: true }"
		:style="{ width: `${width}px` }"
	>
		<span ref="label" class="ui-button__label" :style="labelStyle">
			<slot></slot>
		</span>
	</button>
</template>

<script lang="ts" setup>
import { nextTick, onMounted, ref } from 'vue'

withDefaults(
	defineProps<{
		bg?: string
		width?: number
		size?: string
	}>(),
	{
		bg: '',
		width: 150,
		size: '',
	}
)

const button = ref<HTMLButtonElement>()
const label = ref<HTMLElement>()
const labelStyle = ref<Record<string, string>>({})

/**
 * Доля ширины кнопки, в которую можно писать.
 *
 * Рамка нарисована прямо в png: по краям деревянные накладки, и текст, занявший
 * всю ширину элемента, ложится поверх них. Стекло между накладками занимает
 * около 80% ширины; 0.72 оставляет буквам воздух, а не упирает их в дерево.
 */
const INNER_RATIO = 0.72

/**
 * Ужимает подпись, если она не помещается внутрь рамки.
 *
 * Зачем: Iomanoid и TheBombSound — латинские декоративные шрифты без кириллицы,
 * поэтому русские и казахские подписи рисуются подменным шрифтом, который
 * заметно шире. «Рекорды» и «Играть» из-за этого вылезали за края кнопки
 * задолго до появления новых подписей. Подбирать размер каждой подписи руками
 * бессмысленно — языков три, а шрифт подменяется устройством.
 *
 * Только уменьшает: кнопка, где подпись и так помещается, остаётся прежней.
 */
function fitLabel() {
	const btn = button.value
	const el = label.value
	if (!btn || !el) return

	labelStyle.value = {}

	nextTick(() => {
		const width = el.scrollWidth
		const avail = btn.clientWidth * INNER_RATIO
		if (!width || width <= avail) return

		const base = parseFloat(getComputedStyle(el).fontSize)
		if (!base) return

		labelStyle.value = {
			fontSize: `${Math.max(11, Math.floor(base * (avail / width)))}px`,
		}
	})
}

// Повторный замер, когда догрузятся шрифты: до этого ширина подписи считается
// по запасному шрифту и может оказаться другой.
onMounted(() => {
	fitLabel()
	document.fonts?.ready.then(fitLabel)
})

defineExpose({
	button,
})
</script>

<style lang="scss" scoped>
.ui-button {
	display: inline-block;
	width: 150px;
	aspect-ratio: 2.05;
	border-radius: 18px;
	border: none;
	outline: none;
	cursor: pointer;
	font-family: Iomanoid;
	font-weight: 900;
	text-transform: uppercase;
	font-size: 38px;
	line-height: 1;
	padding-bottom: 5px;
	box-sizing: border-box;
	color: #02020255;
	background-size: contain;
	background-color: transparent;
	background-image: url('@/assets/img/button.png');

	&--grey {
		background-image: url('@/assets/img/button-grey.png');
	}

	&--small {
		font-size: 24px;
	}

	/* inline-block, чтобы scrollWidth равнялся ширине самой подписи, и чтобы
	   центрирование текста осталось ровно таким, каким было без обёртки. */
	&__label {
		display: inline-block;
		white-space: nowrap;
		line-height: inherit;
	}
}
</style>
