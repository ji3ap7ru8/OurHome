// 換誰洗碗頁的 ︙ 換誰洗碗設定視窗（右側滑出，版型與生活圖卡設定相同）。
// 目前只有「成員權限」一張卡片：只能查看可進入的成員名單（由 bowl-options.js 畫在 #bowlMembersBody）；不含使用者帳號區。
export const bowlOptionsTemplate = `
        <div id="bowlOptionsPage" class="translate-x-full absolute top-0 bottom-0 right-0 w-[91%] bg-[#fcfbf9] dark:bg-slate-900 rounded-l-[36px] z-50 flex flex-col soft-shadow-lg border-l border-slate-200/60 dark:border-slate-800 transition-transform duration-300 ease-out overflow-hidden">

            <div class="pt-5 pb-3 px-5 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between shrink-0 select-none">
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-ellipsis-vertical text-base theme-text-primary"></i>
                    <h1 class="text-base font-black text-slate-800 dark:text-slate-100 tracking-wider">換誰洗碗設定</h1>
                </div>
                <div class="flex items-center gap-2">
                    <button data-action="open-settings" data-mode="all" title="系統設定" class="w-9 h-9 rounded-full bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-300/70 theme-text-primary flex items-center justify-center transition-all active:scale-90">
                        <i class="fa-solid fa-gear text-base"></i>
                    </button>
                    <button data-action="close-apps-options" title="關閉設定" class="w-9 h-9 rounded-full bg-slate-200/60 dark:bg-slate-800 hover:bg-rose-100 hover:text-rose-600 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all active:scale-90">
                        <i class="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar pb-12">

                <div id="bowlCardMembers" class="setting-card bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 soft-shadow-sm overflow-hidden transition-all">
                    <button data-accordion-trigger="bmembers" aria-expanded="false" aria-controls="contentBMembers" class="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl theme-bg-light theme-text-primary flex items-center justify-center text-base font-bold shrink-0">
                                <i class="fa-solid fa-user-gear"></i>
                            </div>
                            <div>
                                <h3 class="text-xs font-bold text-slate-800 dark:text-slate-100">成員權限</h3>
                                <p class="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5">可進入的成員名單（僅供查看）</p>
                            </div>
                        </div>
                        <i class="fa-solid fa-chevron-down text-xs text-slate-400 acc-arrow"></i>
                    </button>
                    <div id="contentBMembers" class="acc-body" data-accordion-body="bmembers">
                        <div class="acc-inner">
                            <div id="bowlMembersBody" class="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-3">
                                <p class="text-[10px] text-slate-400 leading-relaxed text-center py-4">讀取中…</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
`;
