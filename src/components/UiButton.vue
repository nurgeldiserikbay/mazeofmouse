<template>
	<button
		ref="button"
		class="ui-button"
		:class="{ [`ui-button--${bg}`]: !!bg, [`ui-button--${size}`]: !!size }"
		:style="{ width: `${width}px` }"
	>
		<span v-if="$slots.icon" class="ui-button__icon"><slot name="icon" /></span>
		<span ref="label" class="ui-button__label" :style="labelStyle">
			<slot></slot>
		</span>
	</button>
</template>

<script lang="ts" setup>
import { nextTick, onMounted, ref } from 'vue'

/**
 * Кнопка садовой темы.
 *
 * Раньше это был png с нарисованной деревянной рамкой: подпись приходилось
 * вписывать в стекло между накладками, и на ru/kk она туда не помещалась.
 * Теперь кнопка собрана из CSS (см. chunky() в _common.scss): ширину задаёт
 * проп, рамка растягивается вместе с ней.
 *
 * bg: '' — зелёная главная, 'grey' — кремовая второстепенная (имя осталось от
 * старых png, чтобы не трогать места вызова).
 */
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
 * Ужимает подпись, если она не помещается в кнопку.
 *
 * Шрифт теперь с кириллицей, но длина слов на трёх языках разная («Мәзірге
 * шығу» против «Exit»), а ширина кнопки фиксированная. Только уменьшает:
 * кнопка, где подпись и так помещается, остаётся прежней.
 */
function fitLabel() {
	const btn = button.value
	const el = label.value
	if (!btn || !el) return

	labelStyle.value = {}

	nextTick(() => {
		const width = el.scrollWidth
		const style = getComputedStyle(btn)
		const icon = btn.querySelector('.ui-button__icon') as HTMLElement | null
		const avail =
			btn.clientWidth -
			parseFloat(style.paddingLeft) -
			parseFloat(style.paddingRight) -
			(icon ? icon.offsetWidth + 10 : 0)
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
@use '@/assets/common' as *;

.ui-button {
	@include chunky($leaf, $leafEdge, 6px, 18px);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
	height: 64px;
	padding: 0 18px 4px;
	box-sizing: border-box;
	outline: none;
	font-family: $font;
	font-weight: 800;
	font-size: 28px;
	line-height: 1;
	letter-spacing: 1px;
	text-transform: uppercase;
	color: #fff;
	text-shadow: 0 2px 0 $leafEdge;
	-webkit-tap-highlight-color: transparent;

	&--grey {
		@include chunky($cream, $woodEdge, 5px, 16px);
		color: $ink;
		text-shadow: none;
	}

	&--small {
		height: 50px;
		font-size: 20px;
	}

	&__icon {
		display: inline-flex;
		flex-shrink: 0;

		:deep(svg) {
			display: block;
			width: 1.1em;
			height: 1.1em;
		}
	}

	&__label {
		display: inline-block;
		white-space: nowrap;
		line-height: inherit;
	}
}
</style>
