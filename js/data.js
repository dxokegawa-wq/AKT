const stores = [
  "桶川店", "平塚店", "ふじみ野店", "鶴瀬店", "美女木店", "岩槻本店", "本部"
];

const checklistData = [
  // --- ホール編 ---
  {
    category: "店舗外周・駐車場・駐輪場他",
    edition: "hall",
    items: [
      { id: "q1", text: "駐車・駐輪場また景品交換所付近はゴミや落ち葉なども無く、きれいな状態でしたか（雑草の状況含む）", points: [3, 1, 0], isPriority: false },
      { id: "q2", text: "外周でのぼり旗や土台、設備などの破損や不備はありませんでしたか ※旗のほつれなど含む", points: [3, 1, 0], isPriority: false },
      { id: "q3", text: "店舗の軒下や出入り口、賞品交換所・駐輪場などにくもの巣はないか、また鳥の巣などがある場合は、糞害防止対策や注意表示はされているか", points: [5, 1, 0], isPriority: true },
      { id: "q4", text: "店外に設置されているゴミ箱は、ゴミで溢れていることなく、見た目の汚れも無く清潔な状態か", points: [3, 1, 0], isPriority: false },
      { id: "q5", text: "店外に設けられた喫煙コーナー内や周辺、置き灰皿は吸殻が溜まっていることなく清潔に保たれているか ※桶川店一部店内", points: [3, 1, 0], isPriority: false },
      { id: "q6", text: "外回りのＰＯＰ・装飾物に歪みや汚れ、色あせなどはありませんでしたか", points: [5, 1, 0], isPriority: true }
    ]
  },
  {
    category: "プロモーション",
    edition: "hall",
    items: [
      { id: "q7", text: "出入口及び施設内の手指の消毒設備は、お客様が使用しやすい場所に設置されているか ※平塚店のみ出入口は除く", points: [3, 1, 0], isPriority: false },
      { id: "q8", text: "ホール内のＰＯＰやポスター、装飾品・掲示物などは曲がりや歪み、破れや汚れ・色あせはありませんでしたか", points: [5, 1, 0], isPriority: true },
      { id: "q9", text: "トイレ内の装飾品・提示物などは曲がりや歪み、破れや汚れ・色あせはありませんでしたか", points: [3, 1, 0], isPriority: false },
      { id: "q10", text: "カウンター賞品のプライスカードやPOPは、見やすく、汚れ・色落ち・破損はないか", points: [3, 1, 0], isPriority: false },
      { id: "q11", text: "島上などのフラッグはキチンと揃っていて、曲がりや汚れ・色落ちなどはないか", points: [3, 1, 0], isPriority: false },
      { id: "q12", text: "イーゼルやデジタルサイネージなどは、破損・汚れやホコリが無く清潔な状態でしたか", points: [3, 1, 0], isPriority: false }
    ]
  },
  {
    category: "設備・クリンリネス",
    edition: "hall",
    items: [
      { id: "q13", text: "出入口付近・風除室内の壁・ドア（ガラス面）・傘立て・モニター・床は、清潔に保たれているか", points: [3, 1, 0], isPriority: false },
      { id: "q14", text: "自動ドアの下のレール内はキレイに清掃されていましたか", points: [3, 1, 0], isPriority: false },
      { id: "q15", text: "遊技中の台に汚れやゴミが目立っていることもなく、特に空き台はゴミも無く清潔な状態ですか", points: [3, 1, 0], isPriority: false },
      { id: "q16", text: "トイレは不快な臭いがしていないか", points: [3, 1, 0], isPriority: false },
      { id: "q17", text: "トイレ内の洗面台・便器や壁・ドア・床などに汚れやゴミが無く、清潔に保たれていましたか　※個室・洗面台下の棚の中含む", points: [5, 1, 0], isPriority: true },
      { id: "q18", text: "トイレのゴミ箱はペーパータオルが溢れていたり、備品などは切れていないか", points: [3, 1, 0], isPriority: false },
      { id: "q19", text: "お客様休憩スペース及びプラスワンコーナーはホコリも無く、清潔な状態でしたか", points: [3, 1, 0], isPriority: false },
      { id: "q20", text: "各自販機・ATM（デビット）・精算機などに汚れやホコリなど目立っていませんでしたか", points: [3, 1, 0], isPriority: false },
      { id: "q21", text: "サービスカウンター内の棚や引き出しの中は整理・整頓されていましたか", points: [3, 1, 0], isPriority: false },
      { id: "q22", text: "サービスカウンター周辺のジュース用冷蔵庫の上やフィルターにホコリや汚れが無い状態でしたか", points: [3, 1, 0], isPriority: false },
      { id: "q23", text: "賞品や賞品棚にホコリが目立っている状態になっていませんでしたか", points: [3, 1, 0], isPriority: false },
      { id: "q24", text: "ホール内の床は汚れが無く、玉やメダルが目立つ場所に落ちていることは無かったですか", points: [3, 1, 0], isPriority: false },
      { id: "q25", text: "ホール内の消火器や消火栓は汚れやホコリが目立っていませんでしたか", points: [3, 1, 0], isPriority: false },
      { id: "q26", text: "店内の空調は快適な状態でしたか（温度、異臭の有無等）※基準：温度25〜28°、湿度40〜70%", points: [3, 1, 0], isPriority: false, hasTempHumidity: true }
    ]
  },

  // --- バックヤード編 ---
  {
    category: "コンプライアンス関係・防災対策等",
    edition: "backyard",
    items: [
      { id: "q27", text: "営業許可証・18歳未満入場禁止・推進機構誓約書の掲示は見える場所にありましたか", points: [3, 1, 0], isPriority: false },
      { id: "q28", text: "依存（のめり込み）問題対応の一環である「子どもの車内放置」撲滅のため、駐車場の定時巡回は行われていますか", points: [3, 1, 0], isPriority: false },
      { id: "q29", text: "変更届出書・変更承認申請書の保管は施錠された場所でしっかり行えていますか", points: [3, 1, 0], isPriority: false },
      { id: "q30", text: "従業者名簿や会員申込用紙の控えは施錠された場所に保管され、わかりやすくファイル管理されていますか ※履歴書保管含む", points: [3, 1, 0], isPriority: false },
      { id: "q31", text: "遊技産業健全化推進機構や県警などの立ち入り検査後の控え書類を綴じるファイルは設けてあるか", points: [3, 1, 0], isPriority: false },
      { id: "q32", text: "管理者業務実務簿及び消防自主点検・防災点検・災害マニュアル確認は実施され、表に漏れ無く記入・チェックされていますか", points: [5, 1, 0], isPriority: true }
    ]
  },
  {
    category: "共生",
    edition: "backyard",
    items: [
      { id: "q33", text: "地域清掃活動は月１回行われており、チェックモレはありませんでしたか ※社員以上全員", points: [5, 1, 0], isPriority: true }
    ]
  },
  {
    category: "事務所・会議室",
    edition: "backyard",
    items: [
      { id: "q34", text: "事務所に向かう階段と周辺、事務所・バックヤードの通路・廊下には物が無くきれいな状態になっていますか", points: [3, 1, 0], isPriority: false },
      { id: "q35", text: "事務所の机の上・周辺、パソコン、複合機・電話、ホールコン・モニターはきれいな状態ですか", points: [5, 1, 0], isPriority: true },
      { id: "q36", text: "机の中や棚・書庫の書類・ファイルは整理整頓され、誰が見てもわかりやすいですか", points: [3, 1, 0], isPriority: false },
      { id: "q37", text: "事務所内に余計な荷物が置きっ放しになっておらず、壁面や窓、床面はきれいな状態になっていますか", points: [3, 1, 0], isPriority: false },
      { id: "q38", text: "金庫室の床や計数機内及び周りがホコリが無くきれいでちきんと整理整頓されていますか", points: [3, 1, 0], isPriority: false },
      { id: "q39", text: "金庫内は整理整頓され、きれいな状態になっていますか？また不要な物はありませんでしたか", points: [3, 1, 0], isPriority: false },
      { id: "q40", text: "会議室の床、壁、テーブルの上はきれいですか、またモニターの電源は点きっ放しになっていませんか", points: [3, 1, 0], isPriority: false },
      { id: "q41", text: "会議室内のその他のホワイトボードはきれいになっていますか？またペンは無駄に使用してませんか", points: [3, 1, 0], isPriority: false }
    ]
  },
  {
    category: "バックヤード部屋他",
    edition: "backyard",
    items: [
      { id: "q42", text: "賞品倉庫内の景品はキチンと整理整頓され、玉数・賞味期限表示がされていますか", points: [3, 1, 0], isPriority: false },
      { id: "q43", text: "部備品倉庫内の工具類は整頓され、用途・品名表示がされていますか", points: [3, 1, 0], isPriority: false },
      { id: "q44", text: "販促物倉庫内のポスター・POP類が整理整頓され、用途表示がされていますか", points: [3, 1, 0], isPriority: false },
      { id: "q45", text: "更衣室内の床・ロッカー・鏡などがきれいで、使用者名記・施錠、ロッカー内は整理整頓されていますか ※抜き打ちチェック含む", points: [3, 1, 0], isPriority: false },
      { id: "q46", text: "スタッフ用のトイレは、床がきれいで、臭いと汚れ（衛生陶器・備え付け器具・換気口）はありませんか", points: [5, 1, 0], isPriority: true },
      { id: "q47", text: "台の保管場所（機械部屋含む）は、機械や備品などキチンと整頓されていて、周辺はきれいな状態になっていますか", points: [3, 1, 0], isPriority: false },
      { id: "q48", text: "消防条例に従い、廊下、通路、空調室内には物が無く、各部屋の整理整頓は出来ていますか ※詳細は別紙にて", points: [3, 1, 0], isPriority: false },
      { id: "q49", text: "外倉庫内は機械や備品などキチンと整頓されていて、周辺はきれいな状態になっていますか", points: [3, 1, 0], isPriority: false },
      { id: "q50", text: "スタッフ休憩室は全体的に整理整頓され、清掃が行われている状態になっていますか", points: [3, 1, 0], isPriority: false },
      { id: "q51", text: "分煙がされ喫煙コーナーはきれいな状態ですか、また吸殻処理は適切に行われていますか", points: [3, 1, 0], isPriority: false }
    ]
  },

  // --- 改善の取組み ---
  {
    category: "改善の取組み",
    edition: "backyard",
    items: [
      { id: "q_special", text: "ホール及びバックヤードにて、改善の取組み（５Sまたは業務改善・効率化）はありましたか", points: [10, 8, 4, 0], isPriority: false }
    ]
  },

  // --- 本部編 ---
  {
    category: "1) 事務所・会議室",
    edition: "hq",
    items: [
      { id: "q_hq_1", text: "【事務所ハード面】机の上・周辺、ＦＡＸ・パソコン、電話、ホールコン・モニターはきれいか？", points: [1, 0], isPriority: false },
      { id: "q_hq_2", text: "【事務所ハード面】流し台周りはきれいな状態になっているか？", points: [1, 0], isPriority: false },
      { id: "q_hq_3", text: "【販促支援課】印刷機器全般はホコリも無く、清掃されているか？", points: [1, 0], isPriority: true },
      { id: "q_hq_4", text: "【事務所ソフト面】各自ロッカーの中や棚・書庫の書類・ファイルは整理整頓され、誰が見てもわかりやすいか？", points: [1, 0], isPriority: false },
      { id: "q_hq_5", text: "【事務所ソフト面】余計な荷物が置きっ放しになっていないか？", points: [1, 0], isPriority: false },
      { id: "q_hq_6", text: "【会議室Ａ・Ｂ・Ｃ】床、壁、テーブルの上はきれいか？またモニターの電源は点きっ放しになっていないか？", points: [1, 0], isPriority: false },
      { id: "q_hq_7", text: "【会議室Ａ・Ｂ・Ｃ】ホワイトボードはきれいになっているか？またペンは無駄に使用していないか？", points: [1, 0], isPriority: false }
    ]
  },
  {
    category: "2) 共生活動",
    edition: "hq",
    items: [
      { id: "q_hq_8", text: "【地域清掃】地域清掃活動は月1回行われており、チェックモレはありませんでしたか ※社員以上全員", points: [1, 0], isPriority: false }
    ]
  },
  {
    category: "3) バックヤード他",
    edition: "hq",
    items: [
      { id: "q_hq_9", text: "【廊下】床はきれいで物が置かれた状態になっていないか？", points: [1, 0], isPriority: false },
      { id: "q_hq_10", text: "【トイレ】床がきれいで、臭いと汚れ（衛生陶器・備え付け器具・換気口）はないか？", points: [1, 0], isPriority: false },
      { id: "q_hq_11", text: "【階段】階段に物が置きっ放しになっていないか？また汚れはないか？", points: [1, 0], isPriority: true },
      { id: "q_hq_12", text: "【スタッフ休憩室】全体的に整理整頓され、清掃が行われている状態になっているか？", points: [1, 0], isPriority: false },
      { id: "q_hq_13", text: "【その他】破損やメンテナンスが必要な箇所はありましたか？", points: [1, 0], isPriority: true }
    ]
  }
];
