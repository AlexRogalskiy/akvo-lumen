(ns akvo.lumen.endpoints-test
  {:functional true}
  (:require [akvo.lumen.fixtures :refer [*system* system-fixture *tenant-conn* tenant-conn-fixture *error-tracker* error-tracker-fixture]]
            [akvo.lumen.protocols :as p]
            [cheshire.core :as json]
            [clojure.java.io :as io]
            [clojure.test :refer :all]
            [clojure.tools.logging :as log]
            [diehard.core :as dh]
            [reitit.core :as r]
            [reitit.ring :as ring]))

(use-fixtures :once system-fixture tenant-conn-fixture error-tracker-fixture)

(def tenant-host "http://t1.lumen.local:3030")

(defn api-url [api-url & args]
  (str  "/api" api-url (when args (str "/" (apply str args)))))

(defn with-body [method uri body & [query-params]]
  (cond->
      {:request-method method
       :uri uri
       :headers {"host" "t1.lumen.local:3030" "content-type" "application/json"}
       :path-info uri
       :server-port 3030,
       :server-name "t1.lumen.local",
       :remote-addr "localhost",
       :scheme :http,
;;       :body-params body
       :body (io/reader (io/input-stream (.getBytes (json/generate-string body))))}
    query-params (assoc :query-params query-params))
  )
(defn post* [uri body & args]
  (apply with-body :post uri body args))

(defn put* [uri body & args]
  (apply with-body :post uri body args))

(defn get* [uri & [query-params]]
  (cond->
      {:request-method :get
       :server-port 3030,
       :server-name "t1.lumen.local",
       :path-info uri
       :remote-addr "localhost",
       :scheme :http,
       :headers {"host" "t1.lumen.local:3030" "content-type" "application/json"}
       :uri uri}
    query-params (assoc :query-params query-params)))

(deftest handler-test
  (let [h (:handler (:akvo.lumen.component.handler/handler *system*))]
    (testing "/"
      (let [r (h (get*  "/healthz"))]
        (is (= 200 (:status r)))
        (is (= {:healthz "ok", :pod nil, :blue-green-status nil}
               (json/parse-string (:body r) keyword))))
      (let [r (h (get*  "/env"))]
        (is (= 200 (:status r)))
        (is (= {:keycloakClient "akvo-lumen",
                :keycloakURL "http://auth.lumen.local:8080/auth",
                :flowApiUrl "https://api.akvotest.org/flow",
                :piwikSiteId "165",
                :tenant "t1",
                :sentryDSN "dev-sentry-client-dsn"}
               (json/parse-string (:body r) keyword)))))
    (testing "/api"
      (let [r (h (get* (api-url "/library")))]
        (is (= 200 (:status r)))
        (is (= {:dashboards []
	        :datasets []
	        :rasters []
	        :visualisations []
	        :collections []}
               (json/parse-string (:body r) keyword))))
      (testing "/collections"
        (let [title* "col-title"]
          (let [{:keys [title id]} (-> (h (post*  (api-url "/collections") {:title title*}))
                                       :body
                                       (json/parse-string keyword))]
            (is (= title* title))
            (is (= id (-> (h (get* (api-url "/collections" id)))
                          :body (json/parse-string keyword) :id))))

          (is (= title* (-> (h (get* (api-url "/library")))
                           :body (json/parse-string keyword) :collections first :title)))
          ))
      (testing "/datasets"
        (let [title "dataset-title"
              dataset-url "https://raw.githubusercontent.com/akvo/akvo-lumen/develop/client/e2e-test/sample-data-1.csv"
              import-id (-> (h (post*  (api-url "/datasets") {:source
                                                              {:kind "LINK"
                                                               :url dataset-url
                                                               :hasColumnHeaders true
                                                               :guessColumnTypes true}
                                                              :name title}))
                            :body
                            (json/parse-string keyword)
                            :importId)
              _           (is (some? import-id))
              dataset-id (dh/with-retry {:retry-if (fn [v e] (not v))
                                         :max-retries 20
                                         :delay-ms 100}
                           (let [job (-> (h (get* (api-url "/job_executions" import-id)))
                                         :body (json/parse-string keyword))
                                 status (:status job)]
                             (when (= "OK" status)
                               (:datasetId job))))]
          (let [dataset (-> (h (get* (api-url "/datasets" dataset-id)))
                            :body (json/parse-string keyword))]
            (is (= {:transformations []
                    :columns
                    [{:key false,
                      :type "text",
                      :title "Name",
                      :multipleId nil,
                      :hidden false,
                      :multipleType nil,
                      :columnName "c1",
                      :direction nil,
                      :sort nil}
                     {:key false,
                      :type "number",
                      :title "Age",
                      :multipleId nil,
                      :hidden false,
                      :multipleType nil,
                      :columnName "c2",
                      :direction nil,
                      :sort nil}
                     {:key false,
                      :type "number",
                      :title "Score",
                      :multipleId nil,
                      :hidden false,
                      :multipleType nil,
                      :columnName "c3",
                      :direction nil,
                      :sort nil}
                     {:key false,
                      :type "number",
                      :title "Temperature",
                      :multipleId nil,
                      :hidden false,
                      :multipleType nil,
                      :columnName "c4",
                      :direction nil,
                      :sort nil}
                     {:key false,
                      :type "number",
                      :title "Humidity",
                      :multipleId nil,
                      :hidden false,
                      :multipleType nil,
                      :columnName "c5",
                      :direction nil,
                      :sort nil}
                     {:key false,
                      :type "text",
                      :title "Cat",
                      :multipleId nil,
                      :hidden false,
                      :multipleType nil,
                      :columnName "c6",
                      :direction nil,
                      :sort nil}]
                    :name title
                    ;;                :modified 1551089874635,
                    ;;                :author nil,
                    :rows
                    [["Bob" 22.0 2.0 4.0 7.0 "A"]
                     ["Jane" 34.0 4.0 8.0 2.0 "B"]
                     ["Frank" 55.0 3.0 3.0 6.0 "A"]
                     ["Lisa" 72.0 5.0 1.0 1.0 "B"]]
                    :status "OK"
                    :id dataset-id}
                   (select-keys dataset [:transformations :columns :name :rows :status :id])))
            (is (= {:url dataset-url
                    :kind "LINK"
                    :guessColumnTypes true
                    :hasColumnHeaders true}
                   (select-keys (:source dataset) [:url :kind :guessColumnTypes :hasColumnHeaders]))))


          (is (= title (-> (h (get* (api-url "/library")))
                           :body (json/parse-string keyword) :datasets first :name)))
          ))
      )))
