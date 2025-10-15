{/* Cadaver Modal */}
{showCadaverModal && isForDeceased && (
  <div className="modal-overlay" onClick={() => setShowCadaverModal(false)}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3>Cadaver Details</h3>
        <button className="close" onClick={() => setShowCadaverModal(false)}>×</button>
      </div>

      <div className="modal-body cadaver-grid">
        {/* Identity Section */}
        <div className="cad-card">
          <div className="cad-title">Identity Information</div>
          <div className="cad-row cad-3">
            <div className="field">
              <label data-required="*">Full Legal Name</label>
              <input
                name="full_name"
                value={cadaver.full_name}
                onChange={onChangeField}
                className={fieldErrors.full_name ? "err" : ""}
                required
              />
              {fieldErrors.full_name && <small className="ferr">{fieldErrors.full_name}</small>}
            </div>
            <div className="field">
              <label>Date of Birth</label>
              <input
                type="date"
                name="dob"
                value={cadaver.dob}
                onChange={onChangeField}
                max={new Date().toISOString().slice(0,10)}
                className={fieldErrors.dob ? "err" : ""}
              />
              {fieldErrors.dob && <small className="ferr">{fieldErrors.dob}</small>}
            </div>
            <div className="field">
              <label>Age (auto if DOB set)</label>
              <input
                type="number"
                name="age"
                value={cadaver.age}
                onChange={onChangeField}
                min={0}
                max={150}
                className={fieldErrors.age ? "err" : ""}
              />
              {fieldErrors.age && <small className="ferr">{fieldErrors.age}</small>}
            </div>
          </div>

          <div className="cad-row cad-3">
            <div className="field">
              <label data-required="*">Sex</label>
              <select
                name="sex"
                value={cadaver.sex}
                onChange={onChangeField}
                className={fieldErrors.sex ? "err" : ""}
                required
              >
                <option value="">Select…</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
              {fieldErrors.sex && <small className="ferr">{fieldErrors.sex}</small>}
            </div>
            <div className="field">
              <label data-required="*">Civil Status</label>
              <select
                name="civil_status"
                value={cadaver.civil_status}
                onChange={onChangeField}
                className={fieldErrors.civil_status ? "err" : ""}
                required
              >
                <option value="">Select…</option>
                <option>Single</option>
                <option>Married</option>
                <option>Widowed</option>
                <option>Separated</option>
              </select>
              {fieldErrors.civil_status && <small className="ferr">{fieldErrors.civil_status}</small>}
            </div>
            <div className="field">
              <label data-required="*">Religion</label>
              <input
                name="religion"
                value={cadaver.religion}
                onChange={onChangeField}
                className={fieldErrors.religion ? "err" : ""}
                required
              />
              {fieldErrors.religion && <small className="ferr">{fieldErrors.religion}</small>}
            </div>
          </div>
        </div>

        {/* Death Details Section */}
        <div className="cad-card">
          <div className="cad-title">Death Details</div>
          <div className="cad-row cad-3">
            <div className="field">
              <label data-required="*">Date & Time of Death</label>
              <input
                type="datetime-local"
                name="death_datetime"
                value={cadaver.death_datetime}
                onChange={onChangeField}
                max={nowLocal}
                className={fieldErrors.death_datetime ? "err" : ""}
                required
              />
              {fieldErrors.death_datetime && <small className="ferr">{fieldErrors.death_datetime}</small>}
            </div>
            <div className="field">
              <label data-required="*">Place of Death</label>
              <input
                name="place_of_death"
                value={cadaver.place_of_death}
                onChange={onChangeField}
                className={fieldErrors.place_of_death ? "err" : ""}
                required
              />
              {fieldErrors.place_of_death && <small className="ferr">{fieldErrors.place_of_death}</small>}
            </div>
            <div className="field">
              <label data-required="*">Cause of Death</label>
              <select
                name="cause_of_death"
                value={cadaver.cause_of_death}
                onChange={onChangeField}
                className={fieldErrors.cause_of_death ? "err" : ""}
                required
              >
                <option>Natural Causes</option>
                <option>Illness</option>
                <option>Accident</option>
                <option>Cardiac Arrest</option>
                <option>Respiratory Failure</option>
                <option>COVID-19</option>
                <option>Unknown</option>
                <option>Other</option>
              </select>
              {fieldErrors.cause_of_death && <small className="ferr">{fieldErrors.cause_of_death}</small>}
            </div>
          </div>

          {cadaver.cause_of_death === "Other" && (
            <div className="cad-row">
              <div className="field col-2">
                <label data-required="*">Please specify</label>
                <input
                  name="cause_of_death_other"
                  value={cadaver.cause_of_death_other}
                  onChange={onChangeField}
                  className={fieldErrors.cause_of_death_other ? "err" : ""}
                  required
                />
                {fieldErrors.cause_of_death_other && <small className="ferr">{fieldErrors.cause_of_death_other}</small>}
              </div>
            </div>
          )}
        </div>

        {/* Next of Kin Section */}
        <div className="cad-card">
          <div className="cad-title">Next of Kin Information</div>
          <div className="cad-row cad-3">
            <div className="field">
              <label data-required="*">Primary Contact Name</label>
              <input
                name="kin_name"
                value={cadaver.kin_name}
                onChange={onChangeField}
                className={fieldErrors.kin_name ? "err" : ""}
                required
              />
              {fieldErrors.kin_name && <small className="ferr">{fieldErrors.kin_name}</small>}
            </div>
            <div className="field">
              <label data-required="*">Relationship</label>
              <input
                name="kin_relation"
                value={cadaver.kin_relation}
                onChange={onChangeField}
                className={fieldErrors.kin_relation ? "err" : ""}
                required
              />
              {fieldErrors.kin_relation && <small className="ferr">{fieldErrors.kin_relation}</small>}
            </div>
            <div className="field">
              <label data-required="*">Mobile</label>
              <input
                type="tel"
                inputMode="numeric"
                name="kin_mobile"
                value={cadaver.kin_mobile}
                onChange={onPhoneChange}
                onKeyDown={onPhoneKeyDown}
                placeholder="e.g., 09171234567"
                className={fieldErrors.kin_mobile ? "err" : ""}
                required
              />
              {fieldErrors.kin_mobile && <small className="ferr">{fieldErrors.kin_mobile}</small>}
            </div>
          </div>
          <div className="cad-row cad-2">
            <div className="field">
              <label data-required="*">Email</label>
              <input
                type="email"
                name="kin_email"
                value={cadaver.kin_email}
                onChange={onChangeField}
                className={fieldErrors.kin_email ? "err" : ""}
                required
              />
              {fieldErrors.kin_email && <small className="ferr">{fieldErrors.kin_email}</small>}
            </div>
            <div className="field">
              <label data-required="*">Address</label>
              <input
                name="kin_address"
                value={cadaver.kin_address}
                onChange={onChangeField}
                className={fieldErrors.kin_address ? "err" : ""}
                required
              />
              {fieldErrors.kin_address && <small className="ferr">{fieldErrors.kin_address}</small>}
            </div>
          </div>
        </div>

        {/* Logistics Section */}
        <div className="cad-card">
          <div className="cad-title">Logistics</div>
          <div className="cad-row cad-2">
            <div className="field">
              <label data-required="*">Current Location of Remains</label>
              <input
                name="remains_location"
                value={cadaver.remains_location}
                onChange={onChangeField}
                className={fieldErrors.remains_location ? "err" : ""}
                required
              />
              {fieldErrors.remains_location && <small className="ferr">{fieldErrors.remains_location}</small>}
            </div>
            <div className="field">
              <label>Special Handling</label>
              <label className="switch-row">
                <input
                  type="checkbox"
                  name="special_handling"
                  checked={!!cadaver.special_handling}
                  onChange={onChangeField}
                />
                <span>Special handling required</span>
              </label>
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="cad-card">
          <div className="cad-title">Documents</div>
          <div className="cad-row cad-2">
            <div className="field col-2">
              <label data-required="*">Death Certificate (required)</label>
              <input
                key={deathCertKey} // lets us hard-reset the file input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setDeathCertFile(e.target.files?.[0] || null)}
                className={fieldErrors.death_certificate_url ? "err" : ""}
                required
              />
              {deathCertFile ? (
                <small className="file-hint">
                  Selected: {deathCertFile.name}{" "}
                  <button
                    type="button"
                    className="linklike"
                    onClick={() => {
                      setDeathCertFile(null);
                      setDeathCertKey((k) => k + 1); // reset native input
                    }}
                  >
                    remove
                  </button>
                </small>
              ) : (
                <small className="hint">Accepted: images or PDF</small>
              )}
              {fieldErrors.death_certificate_url && <small className="ferr">{fieldErrors.death_certificate_url}</small>}
            </div>

            <div className="field">
              <label>Claimant / Next of Kin ID (optional)</label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setClaimantIdFile(e.target.files?.[0] || null)}
              />
              {claimantIdFile && <small className="file-hint">Selected: {claimantIdFile.name}</small>}
            </div>

            <div className="field">
              <label>Burial / Cremation Permit (optional)</label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setPermitFile(e.target.files?.[0] || null)}
              />
              {permitFile && <small className="file-hint">Selected: {permitFile.name}</small>}
            </div>
          </div>
        </div>
      </div>

      {/* Modal footer: Save goes to DB, keeps full validation */}
      <div className="modal-footer">
        <button onClick={() => setShowCadaverModal(false)} className="secondary">Cancel</button>
        <button onClick={handleSaveCadaver} className="primary">Save &amp; Close</button>
      </div>
    </div>
  </div>
)}
