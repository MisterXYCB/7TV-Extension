<template>
	<main class="seventv-settings-chat-filters">
		<div class="tabs"></div>
		<div class="list">
			<div class="item heading">
				<div>Pattern</div>
				<div class="centered">In Message</div>
				<div class="centered">In Username</div>
				<div class="centered">RegExp</div>
				<div class="centered">Case Sensitive</div>
			</div>

			<UiScrollable>
				<template v-for="(f, _, index) of filters.getAll()" :key="f.id">
					<div class="item">
						<!-- Pattern -->
						<div name="pattern" class="use-virtual-input" tabindex="0" @click="onInputFocus(f, 'pattern')">
							<span>{{ f.pattern }}</span>
							<FormInput
								:ref="(c) => inputs.pattern.set(f, c as InstanceType<typeof FormInput>)"
								v-model="f.pattern"
								@blur="onInputBlur(f, 'pattern')"
							/>
						</div>

						<!-- Checkbox: InMessage -->
						<div name="in-message" class="centered">
							<FormCheckbox :checked="!!f.inMessage" @update:checked="onInMessageChange(f, $event)" />
						</div>

						<!-- Checkbox: InUsername -->
						<div name="in-username" class="centered">
							<FormCheckbox :checked="!!f.inUsername" @update:checked="onInUsernameChange(f, $event)" />
						</div>

						<!-- Checkbox: RegExp -->
						<div name="is-regexp" class="centered">
							<FormCheckbox :checked="!!f.regexp" @update:checked="onRegExpStateChange(f, $event)" />
						</div>

						<!-- Checkbox: Case Sensitive -->
						<div name="case-sensitive" class="centered">
							<FormCheckbox
								:checked="!!f.caseSensitive"
								@update:checked="onCaseSensitiveChange(f, $event)"
							/>
						</div>

						<div ref="interactRef" name="interact">
							<CloseIcon v-tooltip="'Remove'" tabindex="0" @click="onFilterDelete(f)" />
						</div>
					</div>
				</template>
			</UiScrollable>

			<!-- New -->
			<div class="item create-new">
				<div name="pattern">
					<FormInput v-model="newInput" label="New Filter..."> hi </FormInput>
				</div>
			</div>
		</div>
	</main>
</template>

<script setup lang="ts">
import { nextTick, reactive, ref, watch } from "vue";
import { useChannelContext } from "@/composable/channel/useChannelContext";
import { FilterDef, useChatFilter } from "@/composable/chat/useChatFilter";
import CloseIcon from "@/assets/svg/icons/CloseIcon.vue";
import UiScrollable from "@/ui/UiScrollable.vue";
import FormCheckbox from "../components/FormCheckbox.vue";
import FormInput from "../components/FormInput.vue";
import { v4 as uuid } from "uuid";

const ctx = useChannelContext(); // this will be an empty context, as config is not tied to channel
const filters = useChatFilter(ctx);

const newInput = ref("");
const inputs = reactive({
	pattern: new WeakMap<FilterDef, InstanceType<typeof FormInput>>(),
});
const interactRef = ref<HTMLElement[]>();

function onInputFocus(f: FilterDef, inputName: keyof typeof inputs): void {
	const input = inputs[inputName].get(f);
	if (!input) return;

	input.focus();
}

function onInputBlur(f: FilterDef, inputName: keyof typeof inputs): void {
	const input = inputs[inputName].get(f);
	if (!input) return;

	const id = uuid();
	filters.updateId("new-filter", id);
	filters.save();
}

function onInMessageChange(f: FilterDef, checked: boolean): void {
	f.inMessage = checked;
	filters.save();
}

function onInUsernameChange(f: FilterDef, checked: boolean): void {
	f.inUsername = checked;
	filters.save();
}

function onRegExpStateChange(f: FilterDef, checked: boolean): void {
	f.regexp = checked;
	filters.save();
}

function onCaseSensitiveChange(f: FilterDef, checked: boolean): void {
	f.caseSensitive = checked;
	filters.save();
}

function onFilterDelete(f: FilterDef): void {
	filters.remove(f.id);
	filters.save();
}

watch(newInput, (val, old) => {
	if (!val || old) return;
	const f = filters.define(
		"new-filter",
		{
			pattern: val,
			inMessage: true,
			inUsername: false,
		},
		true,
	);

	nextTick(() => {
		const input = inputs.pattern.get(f);
		if (!input) return;

		input.focus();
		newInput.value = "";
	});
});
</script>

<style scoped lang="scss">
main.seventv-settings-chat-filters {
	display: grid;
	padding: 0.25rem;
	grid-template-rows: 0 max-content;
	grid-template-areas:
		"tabs"
		"list";

	overflow-x: auto;

	.tabs {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		grid-template-rows: 1fr;
		grid-area: tabs;
	}
	.list {
		display: grid;
		grid-area: list;
		max-height: 36rem;

		.item {
			display: grid;
			grid-auto-flow: row dense;
			grid-template-columns: 20% 1fr 1fr 1fr 1fr 1fr;
			column-gap: 3rem;
			padding: 1rem;

			> div {
				align-self: center;
				&.centered {
					justify-self: center;
				}
			}

			&:nth-child(odd) {
				background-color: var(--seventv-background-shade-2);
			}

			&.heading {
				background-color: var(--seventv-background-shade-3);
				border-bottom: 0.25rem solid var(--seventv-primary);
			}

			&:not(.create-new) > .use-virtual-input {
				cursor: text;
				padding: 0.5rem;
				display: block;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;

				input {
					width: 0;
					height: 0;
					opacity: 0;
				}

				&:focus-within {
					padding: 0;
					span {
						display: none;
					}

					input {
						opacity: 1;
						width: 100%;
						height: initial;
					}
				}
			}

			[name="interact"] {
				display: grid;
				column-gap: 1rem;
				grid-auto-flow: column;
				justify-self: end;

				button {
					all: unset;
					cursor: pointer;
				}

				svg {
					cursor: pointer;
					font-size: 2rem;
					&:hover {
						color: var(--seventv-primary);
					}
				}
			}
		}
	}
}
</style>
