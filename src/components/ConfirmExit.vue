<script lang="ts" setup>
import UiButton from '@/components/UiButton.vue'

/**
 * Подтверждение выхода с игрового экрана.
 *
 * Раньше кнопка «домой» уводила в меню сразу и молча — одно случайное касание
 * стоило партии. Прогресс при выходе сохраняется (обнуляет его только
 * проигрыш), поэтому подпись говорит именно это: уйти не страшно.
 *
 * Оформление общее для всех окон садовой темы (modal-card в _common.scss):
 * кремовая карточка в деревянной раме и табличка с заголовком сверху.
 */
const $emits = defineEmits(['confirm', 'cancel'])
</script>

<template>
	<div class="confirm" @click="$emits('cancel')">
		<div class="confirm__in" @click.stop="">
			<div class="confirm__title">{{ $t('exitTitle') }}</div>
			<img class="confirm__mouse" src="@/assets/img/v2/token-mouse.webp" alt="" />
			<div class="confirm__hint">{{ $t('exitHint') }}</div>

			<UiButton class="confirm__btn" :width="210" @click="$emits('confirm')">
				{{ $t('exitYes') }}
			</UiButton>
			<UiButton
				class="confirm__btn"
				:bg="'grey'"
				:width="210"
				:size="'small'"
				@click="$emits('cancel')"
			>
				{{ $t('exitNo') }}
			</UiButton>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use '@/assets/common' as *;

.confirm {
	@include modal-shade(1150);

	&__in {
		@include modal-card;
		max-width: 320px;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	&__title {
		@include modal-title;
	}

	&__mouse {
		width: 72px;
		height: 72px;
		margin-bottom: 6px;
	}

	&__hint {
		margin-bottom: 20px;
		font-size: 16px;
		font-weight: 600;
		line-height: 1.4;
		color: rgba(74, 42, 16, 0.8);
	}

	&__btn + &__btn {
		margin-top: 16px;
	}
}
</style>
