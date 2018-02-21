# 設定
## 概要
このソフトウェアは

    問題集
        問題1
            第一問
            第二問
            ...
        問題2
            第一問
            第二問
            ...
        ...

という構造となっています。

## json/config.jsonの設定

* name: 問題集の名前を記述します。この内容は画面トップで表示されます。
* description: 問題集の説明を入力します。この内容は、"name"の下に表示されます。HTML構文が使用可能です。ただしscriptタグは動作しません。
* list: 配列で問題情報の記述をします。
    * name: 問題のタイトルを記述します。  「数学I」「数学A」という風に記述します。
    * prefix: 問題に関するファイルを探し出すとき、必要になる文字列です。通常はアルファベット1文字で十分です。
    * num: 問題数を整数型で記述します(ダブルクオーテーションで囲わない)。上の概要の「問題1」「問題2」に該当する数を記述します。
    * passing_mark: 合格点を整数型で記述します(ダブルクオーテーションで囲わない)。テストの合格数がこの点数以上だと「合格」と表示されます。

## json/manifest.jsonの設定

この設定は主にスマートフォン向けです。設定しなくても概ね動作しますが、記述しない場合、テスト設定は削除してください。

* short_name: 短い問題集の名前を記述します。スマートフォンの「ホームに追加」などでタイトルとして表示されます。
* name: json/config.json の"name"と同じものを記述することをおすすめします。
* description: json/config.json より短い、簡潔な説明を記述します。スマートフォンの「ホームに追加」などの説明として表示されます。
* background_color: 主にスマートフォンのホーム画面から起動するときの起動画面の背景色となります。
* theme_color: スマートフォンなどでテーマカラーとして使用されますが、index.htmlの記述が優先されるようですので、書き換える場合は、index.htmlも書き換える必要が有ります。

## img/icon-*x*.pngの書き換え

* img/icon-32x32.png には32px x 32px のアイコンをセットします。
* img/icon-192x192.png には192px x 192px のアイコンをセットします。

## 問題記述
問題はJSON形式で記述し、json/(config.jsonで指定したprefix)/(1から始まる数字).json に配置します。

問題はJSONの配列になっており、上から順に一問ずつ処理します。
各問題は以下のオブジェクトで構成されています。

* text: 問題文です。"\n"は改行に変換されます。HTML　Elementを仕様は将来サポートされないかもしれないので非推奨です。
* select: 選択肢を配列で格納します。一番最初の選択肢が正解になるようにします。現在は4択のみです。
* img: 画像のファイル名を配列で格納します。画像は img/(config.jsonで指定したprefix)/(ファイル名) で参照されます。