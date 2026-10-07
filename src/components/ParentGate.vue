<script lang="ts" setup>
import { computed, ref } from 'vue'

/**
 * Родительский гейт перед уходом из приложения.
 *
 * Зачем: это детское приложение под Families Policy, и Google в отказе прямо
 * пишет про «inadvertent clicks from child users». Ссылка на Google Play из
 * кросс-промо уводит ребёнка из игры одним касанием — гейт делает так, что
 * уйти можно только осознанно, взрослым действием.
 *
 * Пример на умножение, а не «нажмите и держите»: последнее ребёнок повторит
 * сразу. Множители от 6 до 12 — взрослому это устный счёт, ребёнку 4–8 лет,
 * на которого рассчитана игра, нет.
 *
 * Переход сделан настоящей ссылкой, а не window.open: Capacitor сам отдаёт
 * внешний адрес системному браузеру — так же, как ссылка на политику
 * конфиденциальности в меню, которая работает именно этим способом. Открывать
 * адрес кодом пришлось бы через отдельный плагин, которого в проекте нет.
 */
defineProps<{
	href: string
	title: string
}>()

const $emits = defineEmits(['close'])

function digit() {
	return 6 + Math.floor(Math.random() * 7)
}

const a = ref(digit())
const b = ref(digit())
const answer = ref('')

const passed = computed(() => Number(answer.value) === a.value * b.value)
/** Ошибку показываем только когда ответ уже полной длины, а не на каждой цифре. */
const wrong = computed(
	() =>
		answer.value.length >= String(a.value * b.value).length && !passed.value
)

/** Пускаем только цифры: клавиатура на Android отдаёт и точку, и минус. */
function onInput(event: Event) {
	const el = event.target as HTMLInputElement
	answer.value = el.value.replace(/\D/g, '').slice(0, 4)
	el.value = answer.value
}
</script>

<template>
	<div class="gate" @click="$emits('close')">
		<div class="gate__in" @click.stop="">
			<div class="gate__title">{{ $t('gateTitle') }}</div>
			<div class="gate__hint">{{ $t('gateHint') }}</div>

			<div class="gate__task">{{ a }} × {{ b }} = ?</div>

			<input
				class="gate__input"
				:class="{ 'gate__input--wrong': wrong }"
				type="text"
				inputmode="numeric"
				autocomplete="off"
				:value="answer"
				@input="onInput"
			/>

			<a
				v-if="passed"
				class="gate__go"
				:href="href"
				target="_blank"
				rel="noopener"
				@click="$emits('close')"
				>{{ $t('gateOpen') }} · {{ title }}</a
			>
			<div v-else class="gate__go gate__go--off">{{ $t('gateOpen') }}</div>

			<button class="gate__close" @click="$emits('close')">
				{{ $t('gateCancel') }}
			</button>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use '@/assets/common' as *;

.gate {
	@include modal-shade(1200);
	background: rgba(18, 40, 8, 0.8);

	&__in {
		@include modal-card;
		max-width: 340px;
		text-align: center;
	}

	&__title {
		@include modal-title;
	}

	&__hint {
		font-size: 14px;
		font-weight: 500;
		line-height: 1.4;
		color: rgba(74, 42, 16, 0.8);
		margin-bottom: 16px;
	}

	&__task {
		font-size: 34px;
		font-weight: 900;
		letter-spacing: 1px;
		margin-bottom: 12px;
		color: $ink;
	}

	&__input {
		width: 130px;
		padding: 10px;
		border: 2px solid $woodEdge;
		border-radius: 12px;
		outline: none;
		background: #fffaf0;
		box-shadow: inset 0 3px 0 rgba(90, 50, 15, 0.15);
		font-family: $font;
		font-size: 24px;
		font-weight: 800;
		text-align: center;
		color: $ink;

		&--wrong {
			border-color: #c0392b;
			background: #ffe9e4;
		}
	}

	&__go {
		display: block;
		margin: 18px auto 0;
		padding: 12px 14px 13px;
		@include chunky($sun, $sunEdge, 4px, 12px);
		font-size: 15px;
		font-weight: 800;
		text-decoration: none;
		color: $ink;

		&--off {
			opacity: 0.4;
			pointer-events: none;
		}
	}

	&__close {
		margin-top: 14px;
		padding: 8px 12px;
		border: none;
		background: transparent;
		font-family: $font;
		font-size: 14px;
		font-weight: 700;
		color: rgba(74, 42, 16, 0.7);
		cursor: pointer;
	}
}
</style>
