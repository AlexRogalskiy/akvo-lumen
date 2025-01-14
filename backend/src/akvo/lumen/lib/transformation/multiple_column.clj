(ns akvo.lumen.lib.transformation.multiple-column
  (:require [akvo.lumen.lib.dataset.utils :as u]
            [akvo.lumen.lib.transformation.engine :as t.engine]
            [akvo.lumen.util :as util]
            [akvo.lumen.lib.transformation.multiple-column.caddisfly :as t.m-c.caddisfly]
            [akvo.lumen.lib.transformation.multiple-column.geo-shape-features :as t.m-c.geo-shape-features]
            [clojure.tools.logging :as log]
            [clojure.walk :as walk]))

(defmethod t.engine/valid? "core/extract-multiple"
  [op-spec]
  (let [{:keys [onError op args]} (walk/keywordize-keys op-spec)
        columns-to-extract        (filter :extract (:columns args))]
    (and
     (or (:extractImage args) (not-empty columns-to-extract))
     (every? (comp util/valid-type? :type) columns-to-extract)
     (#{"fail" "leave-empty" "delete-row"} onError))))

(defn- apply-operation [deps table-name columns op-spec]
  (let [{:keys [onError op args] :as op-spec} (walk/keywordize-keys op-spec)]
    ;; so far we only implement `caddisfly` in other case we throw exception based on core/condp impl
    (condp = (-> args :selectedColumn :multipleType)
      "caddisfly" (t.m-c.caddisfly/apply-operation deps table-name columns op-spec)
      "geo-shape-features" (t.m-c.geo-shape-features/apply-operation deps table-name columns op-spec))))

(defmethod t.engine/apply-operation "core/extract-multiple"
  [deps table-name columns op-spec]
  (-> (apply-operation deps table-name columns op-spec)
      (update :columns walk/stringify-keys)))

(defmethod t.engine/columns-used "core/extract-multiple"
  [applied-transformation columns]
  [(:columnName (:selectedColumn (:args applied-transformation)))])
