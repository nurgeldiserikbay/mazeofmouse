<template>
	<button
		class="ui-button"
		:class="{ [`ui-button--${bg}`]: true, [`ui-button--${size}`]: true }"
		:style="{ width: `${width}px` }"
	>
		<slot></slot>
	</button>
</template>

<script lang="ts" setup>
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
}
</style>
