// 管理員「最新提醒」編輯視窗（右側滑出，版型與系統設定相同，疊在系統設定上面）。資料存在伺服器端 Firebase（reminders），發布後會顯示在「最新提醒」。
const chip = (v, label, tone, checked = "") => `
                        <label class="cursor-pointer">
                            <input type="radio" name="adminReminderLevel" value="${v}" class="peer sr-only"${checked}>
                            <span class="block py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-[11px] font-bold text-center text-slate-500 dark:text-slate-300 transition-all ${tone}">${label}</span>
                        </label>`;

export const adminReminderTemplate = `
        <div id="adminReminderPage" class="translate-x-full absolute top-0 bottom-0 right-0 w-[91%] bg-[#fcfbf9] dark:bg-slate-900 rounded-l-[36px] z-[60] flex flex-col soft-shadow-lg border-l border-slate-200/60 dark:border-slate-800 transition-transform duration-300 ease-out overflow-hidden">

            <div class="pt-5 pb-3 px-5 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between shrink-0 select-none">
                <div class="flex items-center gap-2">
                    <button data-action="close-admin-reminder" title="返回系統設定" class="w-9 h-9 -ml-2 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-500 flex items-center justify-center transition-all active:scale-90">
                        <i class="fa-solid fa-chevron-left text-sm"></i>
                    </button>
                    <i class="fa-solid fa-bell text-base theme-text-primary"></i>
                    <h1 class="text-base font-black text-slate-800 dark:text-slate-100 tracking-wider">最新提醒</h1>
                </div>
                <button data-action="close-all" title="關閉" class="w-9 h-9 rounded-full bg-slate-200/60 dark:bg-slate-800 hover:bg-rose-100 hover:text-rose-600 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all active:scale-90">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar pb-12">

                <!-- 發布 / 編輯提醒 -->
                <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 soft-shadow-sm p-4 space-y-3">
                    <div class="flex items-center justify-between">
                        <h3 class="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5"><i id="reminderFormIcon" class="fa-solid fa-pen-to-square text-orange-500"></i> <span id="reminderFormTitle">發布新提醒</span></h3>
                        <span class="text-[10px] text-slate-400">存在伺服器端 Firebase</span>
                    </div>
                    <input id="reminderTitle" type="text" maxlength="40" placeholder="提醒標題" class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-orange-500">
                    <textarea id="reminderContent" rows="4" maxlength="500" placeholder="提醒內容..." class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-orange-500 resize-none"></textarea>
                    <div>
                        <div class="text-[10px] font-bold text-slate-400 mb-1.5">提醒等級</div>
                        <div class="grid grid-cols-3 gap-2">${chip("info", "一般", "peer-checked:border-sky-500 peer-checked:bg-sky-50 dark:peer-checked:bg-sky-900/30 peer-checked:text-sky-700", " checked")}${chip("important", "重要", "peer-checked:border-amber-500 peer-checked:bg-amber-50 dark:peer-checked:bg-amber-900/30 peer-checked:text-amber-700")}${chip("urgent", "緊急", "peer-checked:border-rose-500 peer-checked:bg-rose-50 dark:peer-checked:bg-rose-900/30 peer-checked:text-rose-700")}
                        </div>
                    </div>
                    <div class="grid grid-cols-3 gap-2">
                        <button type="button" data-action="reminder-clear" id="reminderClearBtn" class="col-span-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 text-xs font-bold active:scale-95 transition-all">清除</button>
                        <button type="button" data-action="reminder-publish" id="reminderPublishBtn" class="col-span-2 py-2.5 rounded-xl theme-bg-primary text-white text-xs font-bold soft-shadow-sm hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                            <i class="fa-solid fa-paper-plane"></i> <span id="reminderPublishLabel">發布提醒</span>
                        </button>
                    </div>
                </div>

                <!-- 已發布的提醒 -->
                <div class="space-y-2.5">
                    <div class="flex items-center justify-between px-1">
                        <h3 class="text-xs font-bold text-slate-800 dark:text-slate-100">已發布</h3>
                        <span id="reminderAdminCount" class="text-[10px] font-bold text-slate-400">0 則</span>
                    </div>
                    <div id="reminderAdminList" class="space-y-3"></div>
                </div>

            </div>
        </div>
`;
