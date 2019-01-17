(ns akvo.lumen.endpoint.public
  (:require [akvo.lumen.protocols :as p]
            [akvo.lumen.lib.public :as public]
            [cheshire.core :as json]
            [akvo.lumen.specs.components :refer [integrant-key]]
            [clojure.spec.alpha :as s]
            [akvo.lumen.component.tenant-manager :as tenant-manager]
            [integrant.core :as ig]))

(s/def ::windshaft-url string?)

(defmethod integrant-key :akvo.lumen.endpoint.public/public [_]
  (s/cat :kw keyword?
         :config (s/keys :req-un [::tenant-manager/tenant-manager
                                  ::windshaft-url] )))

(defn handler [{:keys [tenant-manager windshaft-url]}]
  (fn [{{:keys [id]} :path-params
        tenant :tenant
        headers :headers}]
    (let [tenant-conn (p/connection tenant-manager tenant)
          password (get headers "x-password")]
      (public/share tenant-conn windshaft-url id password))))

(defn routes [{:keys [tenant-manager] :as opts}]
  ["/:id"
   {:get {:parameters {:path-params {:id string?}}
          :responses {200 {}}
          :handler (handler opts)}}])

(defmethod ig/init-key :akvo.lumen.endpoint.public/public  [_ opts]
  (routes opts))
