(ns akvo.lumen.endpoint.export
  "Exposes the exporter proxy"
  (:require [akvo.lumen.lib.export :as export]
            [integrant.core :as ig]
            [clojure.tools.logging :as log]
            [compojure.core :refer :all]))

(defn endpoint [{:keys [exporter-api-url] :as config} ]
  (log/error :exporter-api-url exporter-api-url)
  (context "/api/exports" _
           (POST "/" {:keys [body jwt-claims headers]}
                 (let [exporter-url (str exporter-api-url "/screenshot")]
                   (export/export exporter-url
                                  (get headers "authorization")
                                  (get jwt-claims "locale")
                                  body)))))

(defmethod ig/init-key :akvo.lumen.endpoint.export/export  [_ opts]
  (endpoint (:config (:config opts))))