// 家庭日曆的 ︙ 日曆設定視窗（右側滑出，版型與系統設定 / 所有應用設定相同）。
// 可輸入 Google 日曆 ID（名稱可不填），數量不限；清單由 calendar-ids.js 畫在 #calendarIdList。
export const calendarIdsTemplate = `
        <div id="calendarIdPage" class="translate-x-full absolute top-0 bottom-0 right-0 w-[91%] bg-[#fcfbf9] dark:bg-slate-900 rounded-l-[36px] z-50 flex flex-col soft-shadow-lg border-l border-slate-200/60 dark:border-slate-800 transition-transform duration-300 ease-out overflow-hidden">

            <div class="pt-5 pb-3 px-5 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between shrink-0 select-none">
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-ellipsis-vertical text-base theme-text-primary"></i>
                    <h1 class="text-base font-black text-slate-800 dark:text-slate-100 tracking-wider">日曆設定</h1>
                </div>
                <div class="flex items-center gap-2">
                    <button data-tip="cards-gear" data-action="open-settings" data-mode="all" title="系統設定" class="w-9 h-9 rounded-full bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-300/70 theme-text-primary flex items-center justify-center transition-all active:scale-90">
                        <i class="fa-solid fa-gear text-base"></i>
                    </button>
                    <button data-tip="cards-close" data-action="close-apps-options" title="關閉設定" class="w-9 h-9 rounded-full bg-slate-200/60 dark:bg-slate-800 hover:bg-rose-100 hover:text-rose-600 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all active:scale-90">
                        <i class="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar pb-12">

                <div class="setting-card bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 soft-shadow-sm overflow-hidden">
                    <div class="p-4 flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl theme-bg-light theme-text-primary flex items-center justify-center text-base font-bold shrink-0">
                            <i class="fa-solid fa-calendar-days"></i>
                        </div>
                        <div>
                            <h3 class="text-xs font-bold text-slate-800 dark:text-slate-100">Google 日曆 ID</h3>
                            <p class="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5">可以新增多個，數量不限</p>
                        </div>
                    </div>
                    <div class="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-3">
                        <div class="space-y-2">
                            <label for="calIdName" data-tip="cal-id-name" class="text-xs font-bold text-slate-700 dark:text-slate-200 block">名稱<span class="text-[10px] font-medium text-slate-400 ml-1">（可不填，最多 20 字）</span></label>
                            <input id="calIdName" type="text" maxlength="20" autocomplete="off" enterkeyhint="next" placeholder="例如：全家行程" class="select-text w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none theme-focus-border">
                            <label for="calIdValue" data-tip="cal-id-value" class="text-xs font-bold text-slate-700 dark:text-slate-200 block pt-1">日曆 ID</label>
                            <input id="calIdValue" type="text" enterkeyhint="done" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="例如：xxxx@group.calendar.google.com" class="select-text w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none theme-focus-border">
                            <button type="button" data-tip="cal-id-add" data-action="calid-add" class="w-full py-2.5 rounded-xl theme-bg-primary text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 active:scale-95 transition">
                                <i class="fa-solid fa-plus"></i> 新增日曆 ID
                            </button>
                        </div>
                        <div id="calendarIdList" class="space-y-2"></div>
                    </div>
                </div>

                <!-- 最底下：Google 帳號。未登入 → 顯示登入（叫出登入頁）；已登入 → 顯示儲存狀態 -->
                <div class="pt-2 space-y-2">
                    <p id="calIdDriveHint" class="text-[10px] text-slate-400 leading-relaxed text-center px-2"></p>
                    <button id="calIdLoginBtn" data-tip="cards-login" type="button" data-action="open-login-from-settings" class="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-700 dark:text-slate-100 font-bold text-xs flex items-center justify-center gap-2.5 soft-shadow-sm active:scale-95 transition-all">
                        <i class="fa-brands fa-google text-sm"></i>
                        <span>使用 Google 帳號登入</span>
                    </button>
                </div>

            </div>
        </div>
`;
