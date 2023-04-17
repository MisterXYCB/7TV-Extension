import { markRaw, reactive, toRaw, watch } from "vue";
import { toReactive } from "@vueuse/core";
import { debounceFn } from "@/common/Async";
import { log } from "@/common/Logger";
import type { ChatMessage } from "@/common/chat/ChatMessage";
import { ChannelContext } from "@/composable/channel/useChannelContext";
import { useConfig } from "../useSettings";

interface ChatFilters {
	filters: Record<string, FilterDef>;
}

export interface FilterDef {
	id: string;

	pattern: string;
	regexp?: boolean;
	readonly cachedRegExp?: RegExp;
	caseSensitive?: boolean;
	inMessage: boolean;
	inUsername: boolean;
	persist?: boolean;
}

const m = new WeakMap<ChannelContext, ChatFilters>();

const customFilters = useConfig<Map<string, FilterDef>>("chat.custom_filter");

export function useChatFilter(ctx: ChannelContext) {
	let data = m.get(ctx);
	if (!data) {
		data = reactive<ChatFilters>({
			filters: {},
		});

		watch(
			customFilters,
			() => {
				if (!data) return;

				for (const [k, v] of Object.entries(data.filters)) {
					if (!v.persist) continue;

					delete data.filters[k];
				}
			},
			{
				immediate: true,
			},
		);

		m.set(ctx, data);
	}

	const save = debounceFn(function (): void {
		if (!data) return;

		const items: [string, FilterDef][] = Array.from(Object.values(data.filters))
			.filter((f) => f.persist)
			.map((f) => [
				f.id,
				toRaw({
					...f,
				}),
			]);

		customFilters.value = new Map(items);
	}, 250);

	function define(id: string, def: Omit<FilterDef, "id">, persist?: boolean): FilterDef {
		if (!data) return {} as FilterDef;

		const f = (data.filters[id] = { ...def, id, persist });

		if (!persist) return f;

		// Store to DB
		customFilters.value.set(id, markRaw(f));
		save();

		return f;
	}

	function remove(id: string): void {
		if (!data) return;

		delete data.filters[id];
		save();
	}

	function checkMatch(key: string, msg: ChatMessage): boolean {
		if (!data) return false;

		const f = data?.filters[key];
		if (!f) return false;

		let ok = false;
		if (!useConfig("chat.filtered_chat")) return false;
		if (useConfig("chat.filter_is_blocklist")) {
			if (f.inMessage) {
				if (f.regexp) {
					let regexp = f.cachedRegExp;
					if (!regexp) {
						try {
							regexp = new RegExp(f.pattern as string, "i");
							Object.defineProperty(f, "cachedRegExp", { value: regexp });
						} catch (err) {
							log.warn("<ChatFilters>", "Invalid regexp:", f.pattern ?? "");
							return false;
						}
					}

					ok = regexp.test(msg.body);
				} else if (f.pattern) {
					ok = f.caseSensitive
						? msg.body.includes(f.pattern)
						: msg.body.toLowerCase().includes(f.pattern.toLowerCase());
				}
			}
			if (f.inUsername && !ok) {
				if (f.regexp) {
					let regexp = f.cachedRegExp;
					if (!regexp) {
						try {
							regexp = new RegExp(f.pattern as string, "i");
							Object.defineProperty(f, "cachedRegExp", { value: regexp });
						} catch (err) {
							log.warn("<ChatFilters>", "Invalid regexp:", f.pattern ?? "");
							return false;
						}
					}

					ok = regexp.test(msg.body);
				} else if (f.pattern) {
					ok = f.caseSensitive
						? msg.body.includes(f.pattern)
						: msg.body.toLowerCase().includes(f.pattern.toLowerCase());
				}
			}
		} else if (!useConfig("chat.filter_is_blocklist") && !ok) {
			if (f.inMessage) {
				if (f.regexp) {
					let regexp = f.cachedRegExp;
					if (!regexp) {
						try {
							regexp = new RegExp(f.pattern as string, "i");
							Object.defineProperty(f, "cachedRegExp", { value: regexp });
						} catch (err) {
							log.warn("<ChatFilters>", "Invalid regexp:", f.pattern ?? "");
							return false;
						}
					}

					ok = !regexp.test(msg.body);
				} else if (f.pattern) {
					ok = !f.caseSensitive
						? msg.body.includes(f.pattern)
						: msg.body.toLowerCase().includes(f.pattern.toLowerCase());
				}
			}
			if (f.inUsername && !ok) {
				if (f.regexp) {
					let regexp = f.cachedRegExp;
					if (!regexp) {
						try {
							regexp = new RegExp(f.pattern as string, "i");
							Object.defineProperty(f, "cachedRegExp", { value: regexp });
						} catch (err) {
							log.warn("<ChatFilters>", "Invalid regexp:", f.pattern ?? "");
							return false;
						}
					}

					ok = !regexp.test(msg.body);
				} else if (f.pattern) {
					ok = !f.caseSensitive
						? msg.body.includes(f.pattern)
						: msg.body.toLowerCase().includes(f.pattern.toLowerCase());
				}
			}
			if (ok) {
				msg.filtered = true;
			}
		}
		return ok;
	}

	function getAll(): Record<string, FilterDef> {
		if (!data) return {};

		return toReactive(data.filters);
	}

	function updateId(oldId: string, newId: string): void {
		if (!data) return;

		const f = data.filters[oldId];
		if (!f) return;

		data.filters[newId] = f;
		delete data.filters[oldId];

		f.id = newId;

		save();
	}

	return {
		define,
		remove,
		getAll,
		save,
		updateId,
		checkMatch,
	};
}
