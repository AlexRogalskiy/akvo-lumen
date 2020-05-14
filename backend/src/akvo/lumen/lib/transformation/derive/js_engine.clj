(ns akvo.lumen.lib.transformation.derive.js-engine
  (:require
   [akvo.lumen.lib.transformation.engine :as engine]
   [clojure.edn :as edn]
   [clojure.java.jdbc :as jdbc]
   [clojure.set :as set]
   [clojure.spec.alpha :as s]
   [clojure.string :as str]
   [clojure.string :as string]
   [clojure.tools.logging :as log])
  (:import [javax.script ScriptEngineManager ScriptEngine Invocable ScriptContext Bindings]
           [jdk.nashorn.api.scripting NashornScriptEngineFactory ClassFilter ScriptObjectMirror]
           [java.lang Double]))

(defn- throw-invalid-return-type [value]
  (throw (ex-info "Invalid return type"
                  {:value value
                   :type (type value)})))

(defn- column-function [fun code]
  (format "var %s = function(row) { return %s; }" fun code))

(defn- valid-type? [value t]
  (when-not (nil? value)
    (condp = t
      "number" (if (and (number? value)
                        (if (float? value)
                          (Double/isFinite value)
                          true))
                 (Double/parseDouble (format "%.3f" (double value)))
                 (throw-invalid-return-type value))
      "text" (if (string? value)
               value
               (throw-invalid-return-type value))
      "date" (cond
               (number? value)
               (java.sql.Timestamp. (long value))

               (and (instance? jdk.nashorn.api.scripting.ScriptObjectMirror value)
                    (.containsKey value "getTime"))
               (java.sql.Timestamp. (long (.callMember value "getTime" (object-array 0))))

               :else
               (throw-invalid-return-type value)))))

(def ^ClassFilter class-filter
  (reify ClassFilter
    (exposeToScripts [this s]
      false)))

(defn- remove-bindings [^Bindings bindings]
  (doseq [function ["print" "load" "loadWithNewGlobal" "exit" "quit" "eval"]]
    (.remove bindings function)))

(defn column-name->column-title
  "replace column-name by column-title"
  [columns]
  (let [key-translation (->> columns
                             (map (fn [{:strs [columnName title]}]
                                    [(keyword columnName) title]))
                             (into {}))]
    #(clojure.set/rename-keys % key-translation)))

(defn- js-factory [] (NashornScriptEngineFactory.))

(defn nashorn-deprecated? []
  (>= (-> (System/getProperty "java.version")
          (string/split #"\.")
          first
          edn/read-string)
      11))

(defn script-engine [factory]
  (if (nashorn-deprecated?)
    (.getScriptEngine factory
                      (into-array String ["--no-deprecation-warning" "--language=es6"])
                      nil class-filter)
    (.getScriptEngine factory class-filter)))

(defn- js-engine
  ([]
   (js-engine (js-factory)))
  ([factory]
   (let [engine (script-engine factory)]
     (remove-bindings (.getBindings engine ScriptContext/ENGINE_SCOPE))
     engine)))

(defn eval*
  ([^String code]
   (eval* (js-engine) code))
  ([^ScriptEngine engine ^String code]
   (.eval ^ScriptEngine engine ^String code)))

(defn- invoke* [^Invocable engine ^String fun & args]
  (.invokeFunction engine fun (object-array args)))

(defn row-transform-fn
  [{:keys [adapter code column-type]}]
  (let [engine (js-engine)
        fun-name "deriveColumn"]
    (eval* engine (column-function fun-name code))
    (fn [row]
      (let [res (->> row
                     (adapter)
                     (invoke* engine fun-name))]
        (if (some? column-type)
            (valid-type? res column-type)
            res)))))

(defn- parse [^String code]
  (let [factory (js-factory)
        engine (script-engine factory)]
    (eval* engine "load('nashorn:parser.js')")
    (.put engine "source_code" code)
    (.values ^ScriptObjectMirror (eval* engine "const sts=[]; parse(source_code, {}, (node) => { if(node.type.indexOf('Statement') !== -1) {sts.push(node.type)}}); sts"))))


(defn evaluable? [code]
  (try
    (let [parsed (parse code)]
      (= parsed ["ExpressionStatement"]))
    (catch Exception e
      (log/warn :not-valid-js code)
      false)))
